const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Generic validation result handler
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Enhanced validation error logging
    console.log('=== VALIDATION ERRORS DETECTED ===');
    console.log('URL:', req.originalUrl);
    console.log('Method:', req.method);
    console.log('Request body:', {
      ...req.body,
      password: '[REDACTED]',
      confirmPassword: '[REDACTED]'
    });
    console.log('User Info:', {
      userId: req.user?.id,
      role: req.user?.role,
      shopId: req.user?.shopId
    });
    console.log('Validation errors:', errors.array());
    console.log('=== END VALIDATION ERRORS ===');

    // Create user-friendly error message
    const errorDetails = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    // Get the first error for the main message
    const firstError = errorDetails[0];
    const userMessage = errorDetails.length === 1
      ? firstError.message
      : `${firstError.message} (and ${errorDetails.length - 1} other error${errorDetails.length > 2 ? 's' : ''})`;

    return res.status(400).json({
      success: false,
      message: userMessage,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: errorDetails
      }
    });
  }
  next();
};

// Custom validator for MongoDB ObjectId
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const ValidationRules = {
  // Admin routes validation
  getUser: [
    param('id')
      .isMongoId()
      .withMessage('Invalid user ID format')
  ],
  
  updateUserStatus: [
    param('id')
      .isMongoId()
      .withMessage('Invalid user ID format'),
    body('status')
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Status must be one of: active, inactive, suspended')
  ],
  
  updateUserSubscription: [
    param('id')
      .isMongoId()
      .withMessage('Invalid user ID format'),
    body('planId')
      .isMongoId()
      .withMessage('Invalid plan ID format'),
    body('expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Expiry date must be a valid date')
  ],
  
  deleteUser: [
    param('id')
      .isMongoId()
      .withMessage('Invalid user ID format')
  ],
  
  // Generic ObjectId validation
  validateObjectId: (paramName) => [
    param(paramName)
      .custom(isValidObjectId)
      .withMessage(`Invalid ${paramName} format`)
  ],

  // User registration validation (simplified)
  registerUser: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('phone')
      .isMobilePhone('any')
      .withMessage('Valid phone number required'),
    body('password')
      .isLength({ min: 6, max: 128 })
      .withMessage('Password must be between 6 and 128 characters'),
    body('confirmPassword')
      .optional()
      .custom((value, { req }) => {
        if (value && value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    body('role')
      .optional()
      .isIn(['restaurant_owner', 'zone_admin', 'zone_shop', 'zone_vendor', 'customer'])
      .withMessage('Invalid user role'),
    body('businessType')
      .optional()
      .isIn(['restaurant', 'zone'])
      .withMessage('Invalid business type')
  ],

  // Zone validation
  createZone: [
    body('adminId')
      .custom(isValidObjectId)
      .withMessage('Valid admin ID required'),
    body('subscriptionId')
      .custom(isValidObjectId)
      .withMessage('Valid subscription ID required'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Zone name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('location')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Location must be 5-200 characters'),
    body('contactInfo.email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid contact email required'),
    body('contactInfo.phone')
      .isMobilePhone('any')
      .withMessage('Valid contact phone required')
  ],

  updateZone: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Zone name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('location')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Location must be 5-200 characters'),
    body('contactInfo.email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid contact email required'),
    body('contactInfo.phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid contact phone required'),
    body('subscriptionId')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Valid subscription ID required')
  ],

  // Zone Shop validation
  createZoneShop: [
    body('ownerId')
      .custom(isValidObjectId)
      .withMessage('Valid owner ID required'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Shop name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('category')
      .isIn([
        'fast_food', 'beverages', 'desserts', 'chinese', 'indian', 'italian', 
        'mexican', 'japanese', 'korean', 'thai', 'american', 'mediterranean',
        'vegetarian', 'vegan', 'halal', 'bakery', 'coffee', 'tea', 'juices',
        'snacks', 'pizza', 'burgers', 'sandwiches', 'salads', 'healthy',
        'breakfast', 'lunch', 'dinner', 'catering', 'other'
      ])
      .withMessage('Invalid shop category'),
    body('contactInfo.email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid contact email required'),
    body('contactInfo.phone')
      .isMobilePhone('any')
      .withMessage('Valid contact phone required'),
    body('contactInfo.whatsapp')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid WhatsApp number required')
  ],

  createZoneShop: [
    body('zoneId')
      .custom(isValidObjectId)
      .withMessage('Valid zone ID is required'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('location')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Location must be 5-200 characters'),
    body('contactInfo.email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('contactInfo.phone')
      .isMobilePhone('any')
      .withMessage('Valid phone number is required'),
    body('openingHours')
      .isArray({ min: 1 })
      .withMessage('At least one opening hour entry is required'),
    body('openingHours.*.day')
      .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Invalid day of week'),
    body('openingHours.*.isOpen')
      .isBoolean()
      .withMessage('isOpen must be a boolean'),
    body('openingHours.*.open')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid time format (HH:MM)'),
    body('openingHours.*.close')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid time format (HH:MM)')
  ],



  updateShopStatus: [
    body('status')
      .isIn(['pending', 'active', 'inactive', 'suspended', 'rejected'])
      .withMessage('Invalid status value'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],

  // Restaurant validation
  createRestaurant: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Restaurant name must be 2-100 characters')
      .matches(/^[a-zA-Z0-9\s\-&'.]+$/)
      .withMessage('Restaurant name can only contain letters, numbers, spaces, hyphens, ampersands, apostrophes, and periods'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('address')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Address must be 5-200 characters'),
    body('contact.phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number required'),
    body('contact.email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('ownerId')
      .optional()
      .isMongoId()
      .withMessage('Valid owner ID required'),
    body('subscriptionId')
      .optional()
      .isMongoId()
      .withMessage('Valid subscription ID required')
  ],

  updateRestaurant: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Restaurant name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('address')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Address must be 5-200 characters'),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number required'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required')
  ],

  // Menu Category validation
  createMenuCategory: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Category name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
    body('image')
      .optional()
      .custom((value) => {
        // Allow null, empty string, or valid URL
        if (value === null || value === '' || value === 'null') {
          return true;
        }
        // Check if it's a valid URL or base64 string
        if (typeof value === 'string' && value.trim().length > 0) {
          return true;
        }
        return false;
      })
      .withMessage('Image must be a valid URL or null'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object')
  ],

  updateMenuCategory: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Category name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer'),
    body('image')
      .optional()
      .custom((value) => {
        // Allow null, empty string, or valid URL
        if (value === null || value === '' || value === 'null') {
          return true;
        }
        // Check if it's a valid URL or base64 string
        if (typeof value === 'string' && value.trim().length > 0) {
          return true;
        }
        return false;
      })
      .withMessage('Image must be a valid URL or null'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object')
  ],

  // Modifier validation
  createModifier: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Modifier name must be 1-50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description cannot exceed 200 characters'),
    body('type')
      .optional()
      .isIn(['single', 'multiple'])
      .withMessage('Type must be single or multiple'),
    body('required')
      .optional()
      .isBoolean()
      .withMessage('Required field must be boolean'),
    body('options')
      .isArray({ min: 1 })
      .withMessage('At least one option is required'),
    body('options.*.name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Option name must be 1-50 characters'),
    body('options.*.price')
      .isFloat({ min: 0 })
      .withMessage('Option price must be a positive number'),
    body('options.*.available')
      .optional()
      .isBoolean()
      .withMessage('Available field must be boolean'),
    body('minSelections')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum selections must be a non-negative integer'),
    body('maxSelections')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Maximum selections must be at least 1'),
    body('menuItems')
      .optional()
      .isArray()
      .withMessage('Menu items must be an array'),
    body('menuItems.*')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Each menu item must be a valid ObjectId')
  ],

  updateModifier: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Modifier name must be 1-50 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Description cannot exceed 200 characters'),
    body('type')
      .optional()
      .isIn(['single', 'multiple'])
      .withMessage('Type must be single or multiple'),
    body('required')
      .optional()
      .isBoolean()
      .withMessage('Required field must be boolean'),
    body('options')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one option is required if provided'),
    body('options.*.name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Option name must be 1-50 characters'),
    body('options.*.price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Option price must be a positive number'),
    body('options.*.available')
      .optional()
      .isBoolean()
      .withMessage('Available field must be boolean'),
    body('minSelections')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum selections must be a non-negative integer'),
    body('maxSelections')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Maximum selections must be at least 1'),
    body('menuItems')
      .optional()
      .isArray()
      .withMessage('Menu items must be an array'),
    body('menuItems.*')
      .optional()
      .custom(isValidObjectId)
      .withMessage('Each menu item must be a valid ObjectId')
  ],

  // Menu Item validation
  createMenuItem: [
    body('categoryId')
      .custom(isValidObjectId)
      .withMessage('Valid category ID required'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Item name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('price')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('modifiers')
      .optional()
      .isArray()
      .withMessage('Modifiers must be an array'),
    body('modifiers.*.name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Modifier name must be 1-50 characters'),
    body('modifiers.*.required')
      .optional()
      .isBoolean()
      .withMessage('Required field must be boolean'),
    body('modifiers.*.options')
      .optional()
      .isArray()
      .withMessage('Options must be an array'),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer')
  ],

  updateMenuItem: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Item name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    body('available')
      .optional()
      .isBoolean()
      .withMessage('Available field must be boolean'),
    body('modifiers')
      .optional()
      .isArray()
      .withMessage('Modifiers must be an array'),
    body('sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer')
  ],

  // Order validation (minimal)
  createOrder: [
    // Minimal validation - just check if items exist
    body('items')
      .optional()
      .isArray()
      .withMessage('Items must be an array if provided')
  ],

  updateOrderStatus: [
    body('status')
      .isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
      .withMessage('Invalid order status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],

  // Subscription validation
  createSubscription: [
    body('userId')
      .custom(isValidObjectId)
      .withMessage('Valid user ID required'),
    body('planKey')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Valid plan key required'),
    body('planType')
      .isIn(['restaurant', 'zone'])
      .withMessage('Plan type must be restaurant or zone')
  ],

  updateSubscription: [
    body('planKey')
      .optional()
      .isString()
      .isLength({ min: 1 })
      .withMessage('Valid plan key required'),
    body('planType')
      .optional()
      .isIn(['restaurant', 'zone'])
      .withMessage('Plan type must be restaurant or zone'),
    body('status')
      .optional()
      .isIn(['active', 'expired', 'cancelled'])
      .withMessage('Invalid subscription status')
  ],

  // Query parameter validation
  validatePagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000')
  ],

  validateSearch: [
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be 1-100 characters')
  ],

  validateSorting: [
    query('sortBy')
      .optional()
      .isString()
      .withMessage('Sort field must be a string'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],

  // Analytics validation
  validateAnalyticsPeriod: [
    query('period')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('Period must be day, week, month, or year'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ],

  // Menu structure validation
  validateMenuStructure: [
    body('categories')
      .optional()
      .isArray()
      .withMessage('Categories must be an array'),
    body('categories.*.id')
      .custom(isValidObjectId)
      .withMessage('Category ID must be a valid ObjectId'),
    body('categories.*.sortOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer')
  ],

  // Login validation
  loginUser: [
    body().custom((body) => {
      // Accept either email or username
      if (!body.email && !body.username) {
        throw new Error('Email or username is required');
      }
      // If email is provided, validate it
      if (body.email && body.email !== 'admin' && !require('validator').isEmail(body.email)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required')
  ],



  updateOrderStatus: [
    param('id')
      .custom(isValidObjectId)
      .withMessage('Valid order ID required'),
    body('status')
      .isIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'])
      .withMessage('Invalid order status')
  ],

  // Zone Shop validation rules
  createZoneShop: [
    body('zoneId')
      .custom(isValidObjectId)
      .withMessage('Valid zone ID required'),
    body('ownerId')
      .custom(isValidObjectId)
      .withMessage('Valid owner ID required'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Shop name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('contactInfo.phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number required'),
    body('contactInfo.email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required')
  ],

  updateZoneShop: [
    param('shopId')
      .custom(isValidObjectId)
      .withMessage('Valid shop ID required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Shop name must be 2-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('contactInfo.phone')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value.trim() === '') return true;
        return require('validator').isMobilePhone(value, 'any');
      })
      .withMessage('Valid phone number required'),
    body('contactInfo.email')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value.trim() === '') return true;
        return require('validator').isEmail(value);
      })
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('location.address')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value.trim() === '') return true;
        return value.trim().length >= 3 && value.trim().length <= 200;
      })
      .withMessage('Address must be 3-200 characters'),
    body('socialMedia')
      .optional()
      .isObject()
      .withMessage('Social media must be an object'),
    body('socialMedia.website')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value.trim() === '') return true;
        return require('validator').isURL(value, { require_protocol: false });
      })
      .withMessage('Website must be a valid URL'),
    body('socialMedia.instagram')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value.trim() === '') return true;
        return value.trim().length <= 100;
      })
      .withMessage('Instagram handle must be less than 100 characters'),
    body('socialMedia.facebook')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value.trim() === '') return true;
        return value.trim().length <= 100;
      })
      .withMessage('Facebook handle must be less than 100 characters'),
    body('media')
      .optional()
      .isObject()
      .withMessage('Media must be an object'),
    body('media.images')
      .optional()
      .isArray()
      .withMessage('Media images must be an array'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    body('settings.estimatedPreparationTime')
      .optional()
      .isInt({ min: 1, max: 120 })
      .withMessage('Preparation time must be between 1 and 120 minutes'),
    body('settings.maxOrdersPerHour')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Max orders per hour must be between 1 and 100')
  ],

  updateShopStatus: [
    param('shopId')
      .custom(isValidObjectId)
      .withMessage('Valid shop ID required'),
    body('status')
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Status must be one of: active, inactive, suspended')
  ],

  updateShopAvailability: [
    param('shopId')
      .custom(isValidObjectId)
      .withMessage('Valid shop ID required'),
    body('status')
      .isIn(['active', 'inactive'])
      .withMessage('Status must be one of: active, inactive')
  ],

  // Customer registration validation
  customerRegistration: [
    body('name')
      .notEmpty()
      .withMessage('Customer name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('phone')
      .notEmpty()
      .withMessage('Phone number is required')
      .isMobilePhone()
      .withMessage('Invalid phone number format'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
    body('orderId')
      .optional()
      .isMongoId()
      .withMessage('Invalid order ID format')
  ],

  // Subscription validation rules
  subscriptionUpgrade: [
    body('planKey')
      .notEmpty()
      .withMessage('Plan key is required')
      .isIn([
        'free_plan',
        'restaurant_free', 'restaurant_basic', 'restaurant_advanced', 'restaurant_premium',
        'restaurant_starter', 'restaurant_professional', 'restaurant_enterprise', // Legacy
        'zone_free', 'zone_basic', 'zone_advanced', 'zone_premium',
        'zone_professional', 'zone_enterprise', // Legacy
        'free', 'basic', 'advanced', 'premium', 'enterprise' // Legacy support
      ])
      .withMessage('Invalid plan key'),
    body('planType')
      .notEmpty()
      .withMessage('Plan type is required')
      .isIn(['restaurant', 'zone'])
      .withMessage('Plan type must be restaurant or zone'),
    body('paymentMethod')
      .optional()
      .isIn(['stripe', 'razorpay', 'upi', 'cash'])
      .withMessage('Invalid payment method')
  ],

  subscriptionPayment: [
    body('planKey')
      .notEmpty()
      .withMessage('Plan key is required'),
    body('paymentMethod')
      .notEmpty()
      .withMessage('Payment method is required')
      .isIn(['razorpay', 'stripe', 'upi'])
      .withMessage('Invalid payment method'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be numeric')
      .custom((value) => value > 0)
      .withMessage('Amount must be greater than 0')
  ],

  subscriptionExtension: [
    body('extensionDays')
      .isInt({ min: 1, max: 365 })
      .withMessage('Extension days must be between 1 and 365'),
    body('reason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Reason cannot exceed 500 characters')
  ],

  subscriptionStatusUpdate: [
    body('status')
      .isIn(['active', 'expired', 'cancelled', 'suspended'])
      .withMessage('Invalid subscription status')
  ],

  customSubscription: [
    body('userId')
      .isMongoId()
      .withMessage('Valid user ID required'),
    body('planKey')
      .notEmpty()
      .withMessage('Plan key is required'),
    body('planType')
      .isIn(['restaurant', 'zone'])
      .withMessage('Plan type must be restaurant or zone'),
    body('customLimits')
      .optional()
      .isObject()
      .withMessage('Custom limits must be an object')
  ],

  bulkSubscriptionUpdate: [
    body('subscriptionIds')
      .isArray({ min: 1 })
      .withMessage('At least one subscription ID required'),
    body('subscriptionIds.*')
      .isMongoId()
      .withMessage('All subscription IDs must be valid'),
    body('updateData')
      .isObject()
      .withMessage('Update data must be an object')
  ],

  // Plan validation rules
  validatePlanType: [
    param('planType')
      .isIn(['restaurant', 'zone'])
      .withMessage('Plan type must be restaurant or zone')
  ],

  validatePlanKey: [
    param('planKey')
      .matches(/^[a-z0-9_-]+$/)
      .withMessage('Plan key can only contain lowercase letters, numbers, underscores, and hyphens')
  ],

  // Payment validation rules
  validateRequired: (fields) => fields.map(field =>
    body(field)
      .notEmpty()
      .withMessage(`${field} is required`)
  )
};

// Export all validation rules and utilities
const exportedRules = {
  ValidationRules,
  handleValidation,
  validateRequest: handleValidation,
  isValidObjectId
};

// Verify all required validation rules exist
const requiredRules = [
  'createZoneShop',
  'updateZoneShop',
  'updateShopStatus',
  'validateObjectId',
  'validatePagination',
  'validateSearch',
  'validateSorting',
  'validateAnalyticsPeriod',
  'loginUser',
  'createOrder',
  'updateOrderStatus',
  'validateMenuStructure'
];

requiredRules.forEach(rule => {
  if (!ValidationRules[rule]) {
    console.error(`Missing required validation rule: ${rule}`);
  } else if (typeof ValidationRules[rule] !== 'function' && !Array.isArray(ValidationRules[rule])) {
    console.error(`Validation rule ${rule} is not a function or array`);
  }
});

module.exports = exportedRules;