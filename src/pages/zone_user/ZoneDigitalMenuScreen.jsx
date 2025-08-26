import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaShoppingCart, FaStar, FaPlus, FaMinus, FaStore, FaExclamationTriangle } from 'react-icons/fa';
import { MdOutlineRamenDining } from "react-icons/md";
import ZoneUserLayout from './ZoneUserLayout';
import ZoneUserNavbar from './ZoneUserNavbar';
import { CartContext } from '../../context/CartContext.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenuItems } from '../../store/slices/menuSlice';
import { fetchMenuCategories } from '../../store/slices/menuSlice';
import { generateZoneUrl } from '../../utils/urlUtils';

const ZoneDigitalMenuScreen = () => {
  const { zoneId, tableId, userId, shopId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems, updateCartItemQuantity, removeFromCart } = useContext(CartContext);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);

  const dispatch = useDispatch();
  const { dishes, loading, error } = useSelector((state) => state.menuItems);
  const { categories } = useSelector((state) => state.zoneMenuCategories);
  const { details: zone } = useSelector((state) => state.restaurant);

  const dishesList = Array.isArray(dishes) ? dishes : [];
  console.log({ categories, dishes: dishesList, loading, error });

  useEffect(() => {
    dispatch(fetchMenuItems({ zoneId, shopId }));
    dispatch(fetchZoneMenuCategories());
  }, [zoneId, shopId, dispatch]);

  useEffect(() => {
    localStorage.setItem('zoneCartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // Filter dishes based on shop (if specific shop selected), category, and search
  const filteredDishes = useMemo(() => {
    return dishesList
      .filter(dish => !shopId || String(dish.shopId) === String(shopId)) // Filter by shop if shopId provided
      .filter(dish => selectedCategory === 'all' || (dish.category && dish.category.toLowerCase() === selectedCategory.toLowerCase()))
      .filter(dish => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        return (
          dish.name.toLowerCase().includes(query) ||
          dish.description.toLowerCase().includes(query) ||
          dish.shopName.toLowerCase().includes(query) ||
          (dish.category && dish.category.toLowerCase().includes(query))
        );
      });
  }, [dishesList, shopId, selectedCategory, searchQuery]);

  // Calculate cart totals using useMemo for performance
  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);
  
  const cartItemCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  // Handle adding item to cart
  const handleAddToCart = (dish) => {
    addToCart({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      image: dish.image,
      quantity: 1,
      shopId: dish.shopId,
      shopName: dish.shopName
    });
    setLastAddedItem(dish);
    setShowCartPopup(true);
    setTimeout(() => setShowCartPopup(false), 3000);
  };

  // Handle incrementing item quantity
  const handleIncrementQuantity = (dish) => {
    const existingItem = cartItems.find(item => item.id === dish.id);
    if (existingItem) {
      updateCartItemQuantity(dish.id, existingItem.quantity + 1);
      setLastAddedItem(dish);
      setShowCartPopup(true);
      setTimeout(() => setShowCartPopup(false), 3000);
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

  // Check if item is in cart - memoized for performance
  const getItemQuantity = useCallback((dishId) => {
    const item = cartItems.find(item => item.id === dishId);
    return item ? item.quantity : 0;
  }, [cartItems]);

  // Navigate to cart
  const goToCart = () => {
    navigate(generateZoneUrl(zoneId, tableId, userId, 'cart'));
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

  const pageTitle = useMemo(() => {
    return shopId
      ? (dishesList.find(d => String(d.shopId) === String(shopId))?.shopName || "Shop Menu")
      : (zone?.name || "Zone Menu");
  }, [shopId, dishesList, zone?.name]);

  if (loading) {
    return (
      <ZoneUserLayout>
        <ZoneUserNavbar
          cartItemCount={cartItemCount}
          showBackButton={true}
          title="Loading Menu..."
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </ZoneUserLayout>
    );
  }

  if (error) {
    return (
      <ZoneUserLayout>
        <ZoneUserNavbar
          cartItemCount={cartItemCount}
          showBackButton={true}
          title="Error"
        />
        <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
          <FaExclamationTriangle className="text-red-500 text-4xl mb-4" />
          <h2 className="text-xl font-fredoka text-primary-bg mb-2">Something went wrong</h2>
          <p className="text-placeholder-subtext font-raleway">{error}</p>
        </div>
      </ZoneUserLayout>
    );
  }

  return (
    <ZoneUserLayout>
      <ZoneUserNavbar
        cartItemCount={cartItemCount}
        showBackButton={true}
        title={pageTitle}
      />

      {/* Search Bar */}
      <div className="relative mb-4 mt-8 px-8">
        <input
          type="text"
          placeholder="Search for dishes or vendors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 sm:p-2 pl-9 sm:pl-8 rounded-full bg-white border border-divider-border focus:border-none text-primary-bg text-base placeholder-placeholder-subtext focus:outline-none focus:ring-2 focus:ring-accent shadow-md autofill-protected"
        />
        <FaSearch className="absolute left-11 sm:left-7 top-1/2 transform -translate-y-1/2 text-placeholder-subtext text-md" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-6 sm:right-7 top-1/2 transform -translate-y-1/2 text-placeholder-subtext hover:text-accent"
          >
            ×
          </button>
        )}
      </div>

      <div className='flex gap-2 sm:gap-2 font-bold mb-4 sm:mb-2'>
        <MdOutlineRamenDining className='text-2xl sm:text-xl text-primary-bg ml-3 sm:ml-4' />
        <p className='text-md sm:text-base'>Hungry? Start Here.</p>
      </div>

      {(dishesList && dishesList.length > 0) ? (
        <>
          {/* Categories */}
          <div className="flex space-x-4 px-4 overflow-x-auto pb-2 scrollbar-hide whitespace-nowrap scroll-smooth mb-3">
            {(categories || []).map(category => (
              <motion.button
                key={category.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-6 sm:px-4 py-1 sm:py-1.5 rounded-full font-raleway text-[14px] sm:text-sm whitespace-nowrap scrollbar-hide scroll-smooth shadow-md
                  ${selectedCategory === category.name ? 'bg-accent text-white' : 'bg-white text-primary-bg border border-divider-border'}`}
              >
                {category.name}
              </motion.button>
            ))}
          </div>

          {/* Dish List */}
          {(filteredDishes && filteredDishes.length > 0) ? (
            <div className="grid items-center justify-center grid-cols-2 p-2 sm:p-4 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {filteredDishes.map(dish => (
                <motion.div
                  key={dish.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col"
                >
                  <div className='relative text-primary-bg'>
                    <img
                      src={dish.image && dish.image.startsWith('data:image') ? dish.image : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5Gb29kIEl0ZW08L3RleHQ+PC9zdmc+'}
                      className="w-full h-36 sm:h-32 md:h-40 lg:h-48 object-cover bg-white rounded-lg sm:rounded-xl shadow-md mb-1 sm:mb-2 cursor-pointer"
                      onClick={() => handleDishClick(dish)}
                    />
                    {/* Shop badge for zone menu */}
                    {!shopId && (
                      <div className="absolute top-2 left-2 bg-white rounded-full px-2 py-1 flex items-center shadow-md">
                        <FaStore className="text-accent text-xs mr-1" />
                        <span className="text-xs font-bold text-primary-bg">{dish.shopName}</span>
                      </div>
                    )}
                  </div>
                  <div className='flex justify-between mr-2'>
                    <h3 className="text-base pt-1 sm:text-base font-raleway font-bold line-clamp-1 pl-1 sm:pl-2">{dish.name}</h3>
                  </div>
                  {!shopId && (
                    <p className="text-xs text-placeholder-subtext pl-1 sm:pl-2">{dish.shopName}</p>
                  )}
                  <p className="font-sans font-medium text-md pl-1 sm:pl-2 mb-2">₹{dish.price.toFixed(2)}</p>
                  {getItemQuantity(dish.id) > 0 ? (
                    <div className="flex items-center mt-auto mb-4">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDecrementQuantity(dish)}
                        className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-hover-shade transition-colors duration-300 shadow-md"
                      >
                        <FaMinus className="text-md" />
                      </motion.button>
                      <span className="mx-2 font-sans font-bold text-lg">{getItemQuantity(dish.id)}</span>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleIncrementQuantity(dish)}
                        className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-hover-shade transition-colors duration-300 shadow-md"
                      >
                        <FaPlus className="text-md" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddToCart(dish)}
                      className="mt-auto w-full mx-auto px-2 rounded-full mb-2 bg-accent text-white py-1.5 sm:py-2 font-raleway text-[16px] sm:text-xs font-bold hover:bg-hover-shade transition-colors duration-300 shadow-md flex items-center justify-center"
                    >
                      <FaShoppingCart className="mr-1" /> Add
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10">
              <p className="text-lg font-medium text-gray-600 mb-2">No dishes found</p>
              <p className="text-sm text-gray-500">Try a different search term or category</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FaStore className="text-accent text-5xl mb-4 opacity-50" />
          <h2 className="text-xl font-fredoka text-primary-bg mb-2">No Menu Items Available</h2>
          <p className="text-placeholder-subtext font-raleway mb-6">
            {shopId
              ? "This vendor doesn't have any menu items yet."
              : "This food zone doesn't have any menu items yet."}
            <br />Please check back later.
          </p>
          <p className="text-xs text-gray-500 max-w-xs">
            {shopId
              ? `Vendor ID: ${shopId} • Zone: ${zoneId} • Table: ${tableId}`
              : `Zone ID: ${zoneId} • Table: ${tableId}`}
          </p>
        </div>
      )}

      {/* Persistent Cart Button */}
      {cartItems.length > 0 && !showCartPopup && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-3 right-3 z-20"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={goToCart}
            className="bg-black text-white p-3 rounded-full shadow-lg flex items-center justify-center relative"
          >
            <FaShoppingCart className="text-lg" />
            <span className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
              {cartItemCount}
            </span>
          </motion.button>
        </motion.div>
      )}

      {/* Cart Popup */}
      <AnimatePresence>
        {showCartPopup && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-2 left-0 right-0 bg-accent text-white p-6 rounded-xl shadow-lg z-80 max-w-md mx-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <FaShoppingCart className="mr-1.5" />
                <span className="font-bold text-md">Added to cart!</span>
              </div>
              <span className="text-md font-sans mb-2 font-bold">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</span>
            </div>

            {lastAddedItem && (
              <div className="flex items-center mb-4">
                <div className="w-9 h-9 bg-white rounded-full overflow-hidden mr-2 shadow-sm">
                  <img src={lastAddedItem.image} alt={lastAddedItem.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-md truncate">{lastAddedItem.name}</p>
                  <p className="text-xs opacity-80">{lastAddedItem.shopName}</p>
                </div>
                <p className="font-bold font-sans text-md">₹{lastAddedItem.price.toFixed(2)}</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div>
                <p className="text-md sm:text-base font-sans font-bold">Total: <span className="font-bold">₹{cartTotal.toFixed(2)}</span></p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={goToCart}
                className="bg-white hover:text-accent/80 text-accent px-4 p-2 rounded-full text-lg font-bold shadow-md flex items-center justify-center"
              >
                <FaShoppingCart className="mr-1 text-2xl" /> View Cart
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ZoneUserLayout>
  );
};

export default ZoneDigitalMenuScreen;
