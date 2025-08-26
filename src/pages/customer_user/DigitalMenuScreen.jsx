import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaShoppingCart, FaStar, FaPlus, FaMinus } from 'react-icons/fa';
import { MdOutlineRamenDining } from "react-icons/md";
import Footer from '../../components/Footer';
import Navbar from '../../components/user/UserNavbar';
import { CartContext } from '../../context/CartContext.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenuItems, fetchMenuCategories } from '../../store/slices/menuSlice';
import { generateContextualUrl, validateUrlParams } from '../../utils/urlUtils';
import logger from '../../services/LoggingService';

// Helper function to create sample menu items for a restaurant
const createSampleMenuForRestaurant = (restaurantId) => {
  const sampleMenuItems = [
    { id: `${restaurantId}_1`, name: 'Signature Burger', description: 'Our house special burger with fresh ingredients', price: 15.99, categoryId: 'cat1', category: 'Main Course', isVeg: false, available: true, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300', restaurantId },
    { id: `${restaurantId}_2`, name: 'Caesar Salad', description: 'Fresh romaine lettuce with parmesan and croutons', price: 12.99, categoryId: 'cat2', category: 'Appetizers', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=300', restaurantId },
    { id: `${restaurantId}_3`, name: 'Grilled Chicken', description: 'Perfectly seasoned grilled chicken breast', price: 18.99, categoryId: 'cat1', category: 'Main Course', isVeg: false, available: true, image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=300', restaurantId },
    { id: `${restaurantId}_4`, name: 'Chocolate Cake', description: 'Rich chocolate cake with fresh berries', price: 8.99, categoryId: 'cat3', category: 'Desserts', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300', restaurantId },
    { id: `${restaurantId}_5`, name: 'Fresh Lemonade', description: 'Refreshing homemade lemonade', price: 4.99, categoryId: 'cat4', category: 'Beverages', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300', restaurantId },
    { id: `${restaurantId}_6`, name: 'Margherita Pizza', description: 'Classic pizza with tomato, mozzarella, and basil', price: 16.99, categoryId: 'cat1', category: 'Main Course', isVeg: true, available: true, image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300', restaurantId }
  ];
  
  localStorage.setItem(`restaurant_menu_items_${restaurantId}`, JSON.stringify(sampleMenuItems));
  console.log('✨ Created sample menu items for restaurant:', restaurantId, sampleMenuItems.length, 'items');
};

// Helper function to create sample categories for a restaurant
const createSampleCategoriesForRestaurant = (restaurantId) => {
  const sampleCategories = [
    { id: 'cat1', name: 'Main Course', description: 'Hearty main dishes to satisfy your hunger', active: true, sortOrder: 1 },
    { id: 'cat2', name: 'Appetizers', description: 'Start your meal with these delicious appetizers', active: true, sortOrder: 2 },
    { id: 'cat3', name: 'Desserts', description: 'Sweet treats to end your meal perfectly', active: true, sortOrder: 3 },
    { id: 'cat4', name: 'Beverages', description: 'Refreshing drinks and hot beverages', active: true, sortOrder: 4 }
  ];
  
  localStorage.setItem(`restaurant_menu_categories_${restaurantId}`, JSON.stringify(sampleCategories));
  console.log('✨ Created sample categories for restaurant:', restaurantId, sampleCategories.length, 'categories');
};

const DigitalMenuScreen = () => {
  const { restaurantName, userId, restaurantId, shopId, tableId, zoneId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems, updateCartItemQuantity, removeFromCart } = useContext(CartContext);

  const dispatch = useDispatch();
  const { items: dishes = [], itemsLoading: loading, itemsError: error } = useSelector((state) => state.menu);
  const { categories = [] } = useSelector((state) => state.menu);

  // Enhanced parameter validation
  const urlParams = { restaurantId, zoneId, tableId, userId, shopId };
  const validation = validateUrlParams(urlParams);
  
  // Log any URL validation issues
  useEffect(() => {
    if (!validation.isValid) {
      logger.error('Invalid URL parameters in DigitalMenuScreen', {
        params: urlParams,
        errors: validation.errors
      }, 'DigitalMenuScreen');
    }
  }, [validation, urlParams]);

  // Create categories list with 'All' option
  const allCategories = [
    { id: 'all', name: 'All' },
    ...categories
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);

  useEffect(() => {
    // Enhanced menu data fetching with better error handling
    if (restaurantId) {
      logger.debug('Fetching restaurant menu', { restaurantId }, 'DigitalMenuScreen');
      dispatch(fetchMenuItems({ restaurantId, entityType: 'restaurant' }));
      dispatch(fetchMenuCategories({ entityId: restaurantId, entityType: 'restaurant' }));
      
      // Ensure sample menu items exist for this restaurant if they don't already
      const existingMenuItems = localStorage.getItem(`restaurant_menu_items_${restaurantId}`);
      const existingCategories = localStorage.getItem(`restaurant_menu_categories_${restaurantId}`);
      
      if (!existingMenuItems || existingMenuItems === '[]') {
        logger.debug('Creating sample menu items', { restaurantId }, 'DigitalMenuScreen');
        createSampleMenuForRestaurant(restaurantId);
        // Re-fetch after creating sample data
        setTimeout(() => {
          dispatch(fetchMenuItems({ restaurantId, entityType: 'restaurant' }));
          dispatch(fetchMenuCategories({ entityId: restaurantId, entityType: 'restaurant' }));
        }, 100);
      }
      
      if (!existingCategories || existingCategories === '[]') {
        logger.debug('Creating sample categories', { restaurantId }, 'DigitalMenuScreen');
        createSampleCategoriesForRestaurant(restaurantId);
        // Re-fetch categories after creating
        setTimeout(() => {
          dispatch(fetchMenuCategories({ entityId: restaurantId, entityType: 'restaurant' }));
        }, 100);
      }
    } else if (shopId && zoneId) {
      logger.debug('Fetching shop menu', { shopId, zoneId }, 'DigitalMenuScreen');
      dispatch(fetchMenuItems({ shopId, zoneId, entityType: 'vendor' }));
      dispatch(fetchMenuCategories({ entityId: shopId, entityType: 'vendor' }));
    } else {
      logger.error('Missing required parameters for menu fetching', urlParams, 'DigitalMenuScreen');
    }
  }, [shopId, restaurantId, zoneId, dispatch]);

  // Enhanced debug logging for state changes
  useEffect(() => {
    if (dishes?.length === 0 && !loading && restaurantId) {
      logger.warn('No menu items found, checking sample data creation', { restaurantId }, 'DigitalMenuScreen');
    }
  }, [dishes, loading, restaurantId]);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // Filter dishes based on both category and search query
  const filteredDishes = dishes
    .filter(dish => selectedCategory === 'all' || dish.categoryId === selectedCategory) // Changed to dish.categoryId
    .filter(dish => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        dish.name.toLowerCase().includes(query) ||
        dish.description.toLowerCase().includes(query) ||
        // Assuming category name is available or can be looked up
        (categories.find(cat => cat.id === dish.categoryId)?.name.toLowerCase().includes(query))
      );
    });

  // Debug filtered dishes only when there are issues
  useEffect(() => {
    if (dishes?.length > 0 && filteredDishes?.length === 0 && selectedCategory === 'all' && !searchQuery) {
      console.log('⚠️ Filtering issue detected:', {
        totalDishes: dishes?.length,
        sampleDish: dishes?.[0],
        selectedCategory
      });
    }
  }, [dishes, filteredDishes, selectedCategory, searchQuery]);

  // Calculate cart totals
  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  // Handle adding item to cart
  const handleAddToCart = (dish) => {
    addToCart({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      image: dish.image,
      quantity: 1
    });
    setLastAddedItem(dish);

    // Show popup
    setShowCartPopup(true);

    // Hide popup after 3 seconds
    setTimeout(() => {
      setShowCartPopup(false);
    }, 3000);
  };

  // Handle incrementing item quantity
  const handleIncrementQuantity = (dish) => {
    const existingItem = cartItems.find(item => item.id === dish.id);
    if (existingItem) {
      updateCartItemQuantity(dish.id, existingItem.quantity + 1);
      setLastAddedItem(dish);

      // Show popup
      setShowCartPopup(true);

      // Hide popup after 3 seconds
      setTimeout(() => {
        setShowCartPopup(false);
      }, 3000);
    }
  };

  // Handle decrementing item quantity
  const handleDecrementQuantity = (dish) => {
    const existingItem = cartItems.find(item => item.id === dish.id);
    if (existingItem && existingItem.quantity > 1) {
      updateCartItemQuantity(dish.id, existingItem.quantity - 1);
    } else if (existingItem && existingItem.quantity === 1) {
      removeFromCart(dish.id);
    }
  };

  // Check if item is in cart
  const getItemQuantity = (dishId) => {
    const item = cartItems.find(item => item.id === dishId);
    return item ? item.quantity : 0;
  };

  // Navigate to cart using enhanced URL utilities
  const goToCart = () => {
    logger.route('DigitalMenuScreen - goToCart', 'cart', urlParams);
    
    try {
      const cartRoute = generateContextualUrl(urlParams, 'cart');
      logger.debug('Generated cart route', { route: cartRoute }, 'DigitalMenuScreen');
      navigate(cartRoute);
    } catch (error) {
      logger.error('Failed to generate cart route', error, 'DigitalMenuScreen');
      // Fallback to tableserve home
      navigate('/tableserve');
    }
  };

  // Handle dish click to show detail popup
  const handleDishClick = (dish) => {
    setSelectedDish(dish);
    setShowDetailPopup(true);
  };

  // Close detail popup
  const closeDetailPopup = () => {
    setShowDetailPopup(false);
  };

  // Determine the ID to pass to UserNavbar
  const idForNavbar = restaurantId || shopId || '';
  const tableNumberForNavbar = tableId || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 text-gray-900 relative pb-safe">
      <Navbar restaurantId={idForNavbar} tableNumber={tableNumberForNavbar} />

      {/* Responsive Search Bar */}
      <div className="relative mb-4 mt-6 px-4 sm:px-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for delicious dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 sm:p-4 pl-10 sm:pl-12 pr-10 sm:pr-12 rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200 focus:border-accent text-gray-800 text-base sm:text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 shadow-lg transition-all duration-300 touch-manipulation"
          />
          <FaSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-base sm:text-lg" />
          {searchQuery && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchQuery('')}
              className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg sm:text-xl w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center rounded-full transition-all duration-200 touch-manipulation"
            >
              ×
            </motion.button>
          )}
        </div>
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-4 sm:left-6 right-4 sm:right-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg mt-1 p-3 border border-gray-100 z-10"
          >
            <p className="text-sm sm:text-base text-gray-600">
              Searching for "{searchQuery}"
            </p>
          </motion.div>
        )}
      </div>
      {/* Mobile-Optimized Welcome Section */}
      <div className='flex items-center gap-3 px-4 mb-4'>
        <div className="w-10 h-10 bg-gradient-to-br from-accent to-red-500 rounded-full flex items-center justify-center shadow-lg">
          <MdOutlineRamenDining className='text-xl text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-gray-800 font-fredoka leading-tight'>Hungry? Start Here.</h2>
          <p className='text-xs text-gray-600 font-raleway'>Discover amazing dishes crafted just for you</p>
        </div>
      </div>
      {/* Responsive Categories */}
      <div className="px-4 sm:px-6 mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 font-fredoka">Browse Categories</h3>
        <div className="flex space-x-2 sm:space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {allCategories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory(category.id)}
              className={`relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-raleway text-sm sm:text-base font-medium whitespace-nowrap transition-all duration-300 shadow-md touch-manipulation min-w-fit
                ${selectedCategory === category.id 
                  ? 'bg-gradient-to-r from-accent to-red-500 text-white shadow-lg' 
                  : 'bg-white/90 backdrop-blur-sm text-gray-700 border border-gray-200'}`}
            >
              {selectedCategory === category.id && (
                <motion.div
                  layoutId="categorySelector"
                  className="absolute inset-0 bg-gradient-to-r from-accent to-red-500 rounded-xl sm:rounded-2xl"
                  style={{ zIndex: -1 }}
                />
              )}
              <span className="relative z-10">{category.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Mobile-Optimized Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 border-t-accent rounded-full animate-spin mb-4"></div>
            <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-r-red-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="text-center max-w-xs">
            <h3 className="text-xl font-bold text-gray-800 mb-2 font-fredoka">Loading Menu</h3>
            <p className="text-base font-medium text-gray-600 mb-1 font-raleway">Preparing delicious dishes...</p>
            <p className="text-sm text-gray-500 font-raleway">Please wait while we fetch the latest items</p>
          </div>
          <div className="flex space-x-1 mt-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-accent rounded-full"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
            <MdOutlineRamenDining className="text-3xl sm:text-4xl text-red-500" />
          </div>
          <div className="text-center max-w-sm sm:max-w-md">
            <h3 className="text-xl sm:text-2xl font-bold text-red-600 mb-2 sm:mb-3 font-fredoka">Menu Unavailable</h3>
            <p className="text-base sm:text-lg font-medium text-gray-600 mb-2 font-raleway">We couldn't load the menu</p>
            <p className="text-sm text-gray-500 mb-4 sm:mb-6 font-raleway bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (restaurantId) {
                  dispatch(fetchMenuItems({ restaurantId, entityType: 'restaurant' }));
                  dispatch(fetchMenuCategories({ entityId: restaurantId, entityType: 'restaurant' }));
                } else if (shopId) {
                  dispatch(fetchMenuItems({ shopId, zoneId, entityType: 'vendor' }));
                  dispatch(fetchMenuCategories({ entityId: shopId, entityType: 'vendor' }));
                }
              }}
              className="px-6 sm:px-8 py-3 bg-gradient-to-r from-accent to-red-500 text-white rounded-xl font-semibold font-raleway shadow-lg transition-all duration-300 flex items-center justify-center touch-manipulation"
            >
              🔄 Try Again
            </motion.button>
          </div>
        </div>
      ) : filteredDishes.length > 0 ? (
        <div className="px-4 pb-32">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredDishes.map((dish, index) => (
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md transition-all duration-300 overflow-hidden border border-gray-100/50"
              >
                {/* Responsive Dish Image */}
                <div className='relative overflow-hidden'>
                  <motion.img
                    src={dish.image}
                    alt={dish.name}
                    className="w-full h-32 sm:h-36 md:h-40 lg:h-44 object-cover cursor-pointer transition-transform duration-300"
                    onClick={() => handleDishClick(dish)}
                    whileTap={{ scale: 0.98 }}
                  />
                  
                  {/* Compact Veg/Non-Veg Indicator */}
                  <div className="absolute top-2 left-2">
                    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border ${dish.isVeg ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'} flex items-center justify-center`}>
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${dish.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                  </div>
                  
                  {/* Availability Overlay */}
                  {!dish.available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-xs sm:text-sm bg-black/40 px-2 sm:px-3 py-1 rounded-full">Out of Stock</span>
                    </div>
                  )}
                </div>

                {/* Responsive Dish Info */}
                <div className='p-3 sm:p-4'>
                  <div className='mb-2'>
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 line-clamp-2 font-fredoka leading-tight mb-1">
                      {dish.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2 font-raleway leading-relaxed">
                      {dish.description}
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-lg sm:text-xl font-bold text-gray-800 font-fredoka">₹{dish.price.toFixed(2)}</span>
                  </div>
                  
                  {/* Responsive Add to Cart Section */}
                  {getItemQuantity(dish.id) > 0 ? (
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-2 sm:p-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDecrementQuantity(dish)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-accent to-red-500 text-white flex items-center justify-center shadow-md touch-manipulation"
                      >
                        <FaMinus className="text-xs" />
                      </motion.button>
                      <span className="text-base sm:text-lg font-bold text-gray-800 mx-2 sm:mx-3 font-fredoka">
                        {getItemQuantity(dish.id)}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleIncrementQuantity(dish)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-accent to-red-500 text-white flex items-center justify-center shadow-md touch-manipulation"
                      >
                        <FaPlus className="text-xs" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleAddToCart(dish)}
                      disabled={!dish.available}
                      className={`w-full py-2 sm:py-2.5 rounded-xl font-bold font-raleway text-sm transition-all duration-300 flex items-center justify-center space-x-1 touch-manipulation
                        ${dish.available 
                          ? 'bg-gradient-to-r from-accent to-red-500 text-white shadow-md' 
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                    >
                      <FaShoppingCart className="text-sm" />
                      <span>{dish.available ? 'Add' : 'N/A'}</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
            <MdOutlineRamenDining className="text-4xl sm:text-5xl text-gray-400" />
          </div>
          <div className="text-center max-w-xs sm:max-w-md">
            <h3 className="text-lg sm:text-2xl font-bold text-gray-600 mb-2 sm:mb-3 font-fredoka">
              {searchQuery || selectedCategory !== 'all' ? 'No Dishes Found' : 'Menu Coming Soon'}
            </h3>
            <p className="text-sm sm:text-lg text-gray-500 mb-4 sm:mb-6 font-raleway">
              {searchQuery || selectedCategory !== 'all' ? 
               'Try adjusting your search or browse different categories' : 
               'Our chefs are preparing something amazing'}
            </p>
            
            {searchQuery && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mb-3 sm:mb-4 px-5 sm:px-6 py-2 bg-gradient-to-r from-accent to-red-500 text-white rounded-xl font-semibold font-raleway shadow-md transition-all duration-300 touch-manipulation"
              >
                Clear Search
              </motion.button>
            )}
            
            {(!dishes?.length && restaurantId) && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  logger.debug('Creating sample data for restaurant', { restaurantId }, 'DigitalMenuScreen');
                  createSampleMenuForRestaurant(restaurantId);
                  createSampleCategoriesForRestaurant(restaurantId);
                  setTimeout(() => {
                    dispatch(fetchMenuItems({ restaurantId, entityType: 'restaurant' }));
                    dispatch(fetchMenuCategories({ entityId: restaurantId, entityType: 'restaurant' }));
                  }, 200);
                }}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold font-raleway shadow-md transition-all duration-300 flex items-center justify-center touch-manipulation"
              >
                🍴 Load Sample Menu
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Responsive Persistent Cart Button */}
      {cartItems.length > 0 && !showCartPopup && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 z-30"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goToCart}
            className="relative bg-gradient-to-r from-accent to-red-500 text-white p-3 sm:p-4 rounded-full shadow-2xl transition-all duration-300 border-2 border-white/20 backdrop-blur-sm touch-manipulation"
          >
            <FaShoppingCart className="text-lg sm:text-xl" />
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 bg-white text-accent text-xs sm:text-sm font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shadow-lg border border-accent"
            >
              {cartItemCount}
            </motion.span>
          </motion.button>
        </motion.div>
      )}

      {/* Enhanced Theme-Consistent Cart Popup */}
      <AnimatePresence>
        {showCartPopup && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-accent to-red-500 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl z-50 border border-white/20 backdrop-blur-sm max-w-md mx-auto"
          >
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <FaShoppingCart className="text-sm sm:text-base" />
                </div>
                <div>
                  <span className="font-bold text-base sm:text-lg font-fredoka">Added to Cart!</span>
                  <p className="text-white/80 text-xs sm:text-sm font-raleway">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowCartPopup(false)}
                className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center transition-colors touch-manipulation"
              >
                <span className="text-lg sm:text-xl">×</span>
              </motion.button>
            </div>

            {lastAddedItem && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center mb-4 sm:mb-5 bg-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-3 backdrop-blur-sm"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full overflow-hidden mr-2 sm:mr-3 shadow-lg">
                  <img src={lastAddedItem.image} alt={lastAddedItem.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm sm:text-base font-fredoka truncate">{lastAddedItem.name}</p>
                  <p className="text-white/80 text-xs sm:text-sm font-raleway">Fresh & Delicious</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-base sm:text-lg font-fredoka">₹{lastAddedItem.price.toFixed(2)}</p>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/80 text-xs sm:text-sm font-raleway">Cart Total</p>
                <p className="text-lg sm:text-xl font-bold font-fredoka">₹{cartTotal.toFixed(2)}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={goToCart}
                className="bg-white text-accent px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold font-raleway shadow-lg transition-all duration-300 flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base touch-manipulation"
              >
                <FaShoppingCart className="text-sm sm:text-base" />
                <span>View Cart</span>
              </motion.button>
            </div>
          </motion.div>
        )}


        {/* Responsive Theme-Consistent Dish Detail Bottom Sheet */}
        {showDetailPopup && selectedDish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
            onClick={closeDetailPopup}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto pb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Responsive Header with Drag Handle */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-3"></div>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 font-fredoka mb-1 sm:mb-2 line-clamp-2">{selectedDish.name}</h2>
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <span className="text-2xl sm:text-3xl font-bold text-accent font-fredoka">₹{selectedDish.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={closeDetailPopup}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center transition-colors touch-manipulation"
                  >
                    <span className="text-xl sm:text-2xl text-gray-600">×</span>
                  </motion.button>
                </div>
              </div>

              {/* Responsive Image Section */}
              <div className="px-4 sm:px-6 mb-4 sm:mb-6">
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden">
                  <img
                    src={selectedDish.image}
                    alt={selectedDish.name}
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                  
                  {/* Responsive Mobile Indicators */}
                  <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 ${selectedDish.isVeg ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'} flex items-center justify-center`}>
                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${selectedDish.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsive Content */}
              <div className="px-4 sm:px-6">
                {/* Description */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3 font-fredoka">About This Dish</h3>
                  <p className="text-gray-600 text-base sm:text-lg leading-relaxed font-raleway">{selectedDish.description}</p>
                </div>

                {/* Responsive Info Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="bg-green-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🌿</div>
                    <span className="text-sm sm:text-base font-medium text-green-700">
                      {selectedDish.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    </span>
                  </div>
                  <div className="bg-blue-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚙️</div>
                    <span className="text-sm sm:text-base font-medium text-blue-700">Fresh Made</span>
                  </div>
                </div>
              </div>

              {/* Responsive Action Section - Sticky Bottom */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-6 space-y-3 sm:space-y-4">
                {getItemQuantity(selectedDish.id) > 0 ? (
                  <div className="flex items-center justify-center space-x-6 sm:space-x-8 bg-gray-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDecrementQuantity(selectedDish)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-accent to-red-500 text-white flex items-center justify-center shadow-lg touch-manipulation"
                    >
                      <FaMinus className="text-sm sm:text-base" />
                    </motion.button>
                    <span className="text-2xl sm:text-3xl font-bold text-gray-800 min-w-[2.5rem] sm:min-w-[3rem] text-center font-fredoka">
                      {getItemQuantity(selectedDish.id)}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleIncrementQuantity(selectedDish)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-accent to-red-500 text-white flex items-center justify-center shadow-lg touch-manipulation"
                    >
                      <FaPlus className="text-sm sm:text-base" />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      handleAddToCart(selectedDish);
                      closeDetailPopup();
                    }}
                    className="w-full py-4 sm:py-5 bg-gradient-to-r from-accent to-red-500 text-white rounded-2xl sm:rounded-3xl text-lg sm:text-xl font-bold font-raleway shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3 touch-manipulation"
                  >
                    <FaShoppingCart className="text-lg sm:text-xl" />
                    <span>Add to Cart - ₹{selectedDish.price.toFixed(2)}</span>
                  </motion.button>
                )}
                
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={closeDetailPopup}
                  className="w-full py-3 sm:py-4 bg-gray-100 text-gray-700 rounded-2xl sm:rounded-3xl text-base sm:text-lg font-semibold font-raleway transition-colors touch-manipulation"
                >
                  Continue Browsing
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
};

export default DigitalMenuScreen;