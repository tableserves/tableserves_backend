import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaShoppingCart, FaPlus, FaMinus, FaUtensils, FaArrowLeft } from 'react-icons/fa';
import { MdOutlineRamenDining, MdClose } from "react-icons/md";
import Navbar from '../../components/restaurant/RestaurantNavbar.jsx';
import BrandFooter from '../../components/common/BrandFooter.jsx';
import { CartContext } from '../../context/CartContext.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMenuItems, fetchMenuCategories, fetchMenuModifiers, fetchMenuVariants } from '../../../../store/slices/menuSlice.js';
import { generateContextualUrl, validateUrlParams } from '../../../../shared/routing/urlUtils.js';
import logger from '../../../../services/LoggingService.js';

const DigitalMenuScreen = () => {
  const { restaurantName, userId, restaurantId, shopId, tableId, zoneId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems, updateCartItemQuantity, removeFromCart } = useContext(CartContext);
  const dispatch = useDispatch();

  const { items: dishes = [], itemsLoading: loading, itemsError: error } = useSelector((state) => state.menu);
  const { categories, modifiers, variants } = useSelector((state) => ({
    categories: Array.isArray(state.menu.categories) ? state.menu.categories : [],
    modifiers: Array.isArray(state.menu.modifiers) ? state.menu.modifiers : [],
    variants: Array.isArray(state.menu.variants) ? state.menu.variants : []
  }));

  const urlParams = useMemo(() => ({ restaurantId, zoneId, tableId, userId, shopId }), [restaurantId, zoneId, tableId, userId, shopId]);
  
  useEffect(() => {
    const validation = validateUrlParams(urlParams);
    if (!validation.isValid) {
      logger.error('Invalid URL parameters in DigitalMenuScreen', { params: urlParams, errors: validation.errors }, 'DigitalMenuScreen');
    }
  }, [urlParams]);

  // OPTIMIZATION 1: Memoize categories
  const activeCategories = useMemo(() => categories.filter(category => category.active !== false && category.isActive !== false), [categories]);
  const allCategories = useMemo(() => [{ id: 'all', name: 'All' }, ...activeCategories], [activeCategories]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});

  useEffect(() => {
    if (restaurantId) {
      dispatch(fetchMenuItems({ entityId: restaurantId, entityType: 'restaurant' }));
      dispatch(fetchMenuCategories({ entityId: restaurantId, entityType: 'restaurant' }));
      dispatch(fetchMenuModifiers({ entityId: restaurantId, entityType: 'restaurant' }));
      dispatch(fetchMenuVariants({ entityId: restaurantId, entityType: 'restaurant' }));
    } else if (shopId && zoneId) {
      dispatch(fetchMenuItems({ entityId: shopId, entityType: 'vendor' }));
      dispatch(fetchMenuCategories({ entityId: shopId, entityType: 'vendor' }));
      dispatch(fetchMenuModifiers({ entityId: shopId, entityType: 'vendor' }));
      dispatch(fetchMenuVariants({ entityId: shopId, entityType: 'vendor' }));
    }
  }, [shopId, restaurantId, zoneId, dispatch]);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // OPTIMIZATION 2: Memoize the search and filter so it doesn't recalculate on every minor state change
  const filteredDishes = useMemo(() => {
    return dishes
      .filter(dish => selectedCategory === 'all' || dish.categoryId === selectedCategory)
      .filter(dish => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        return (
          dish.name.toLowerCase().includes(query) ||
          dish.description.toLowerCase().includes(query) ||
          (activeCategories.find(cat => cat.id === dish.categoryId)?.name.toLowerCase().includes(query))
        );
      });
  }, [dishes, selectedCategory, searchQuery, activeCategories]);

  // Segregate and Group Dishes by Category
  const groupedDishes = useMemo(() => {
    const groups = {};
    activeCategories.forEach(cat => { groups[cat.name] = []; });
    groups['Other'] = [];

    filteredDishes.forEach(dish => {
      const cat = activeCategories.find(c => c.id === dish.categoryId);
      const catName = cat ? cat.name : 'Other';
      if (groups[catName]) groups[catName].push(dish);
      else groups[catName] = [dish];
    });

    return Object.entries(groups).filter(([_, groupDishes]) => groupDishes.length > 0);
  }, [filteredDishes, activeCategories]);

  // OPTIMIZATION 3: Pre-calculate variants and modifiers for the popup so they don't block the animation render thread
  const currentDishVariants = useMemo(() => {
    if (!selectedDish) return [];
    return variants.filter(v => v.menuItems?.includes(selectedDish.id));
  }, [selectedDish, variants]);

  const currentDishModifiers = useMemo(() => {
    if (!selectedDish) return [];
    return modifiers.filter(m => m.menuItems?.includes(selectedDish.id));
  }, [selectedDish, modifiers]);

  const cartTotal = useMemo(() => cartItems.reduce((total, item) => total + (item.price * item.quantity), 0), [cartItems]);
  const cartItemCount = useMemo(() => cartItems.reduce((count, item) => count + item.quantity, 0), [cartItems]);

  const calculateItemPrice = useCallback((dish, currentModifiers = {}, currentVariants = {}) => {
    if (!dish) return 0;
    let totalPrice = dish.price;
    
    Object.keys(currentModifiers).forEach(modifierId => {
      const modifier = modifiers.find(m => m.id === modifierId);
      if (modifier) {
        currentModifiers[modifierId].forEach(optionId => {
          const option = modifier.options.find(o => (o._id || o.id) === optionId);
          if (option) totalPrice += option.price;
        });
      }
    });
    
    Object.keys(currentVariants).forEach(variantId => {
      const variant = variants.find(v => v.id === variantId);
      if (variant && currentVariants[variantId].length > 0) {
        const selectedOptionId = currentVariants[variantId][0];
        const option = variant.options.find(o => (o._id || o.id) === selectedOptionId);
        if (option) {
          totalPrice = option.price;
          // Re-add modifier prices to the new variant base price
          Object.keys(currentModifiers).forEach(modifierId => {
            const modifier = modifiers.find(m => m.id === modifierId);
            if (modifier) {
              currentModifiers[modifierId].forEach(optionId => {
                const modOption = modifier.options.find(o => (o._id || o.id) === optionId);
                if (modOption) totalPrice += modOption.price;
              });
            }
          });
        }
      }
    });
    return totalPrice;
  }, [modifiers, variants]);

  const handleAddToCart = (dish, modifierSelections = {}, variantSelections = {}) => {
    const dishVariants = variants.filter(v => v.menuItems?.includes(dish.id));
    const dishModifiers = modifiers.filter(m => m.menuItems?.includes(dish.id));
    const hasCustomization = dishVariants.length > 0 || dishModifiers.length > 0;
    
    if (hasCustomization && Object.keys(modifierSelections).length === 0 && Object.keys(variantSelections).length === 0) {
      handleDishClick(dish);
      return;
    }
    
    const totalPrice = calculateItemPrice(dish, modifierSelections, variantSelections);
    addToCart({ id: dish.id, name: dish.name, price: totalPrice, basePrice: dish.price, image: dish.image, quantity: 1, modifiers: modifierSelections, variants: variantSelections });
  };

  const handleIncrementQuantity = (dish) => {
    const existingItem = cartItems.find(item => item.id === dish.id);
    if (existingItem) {
      updateCartItemQuantity(dish.id, existingItem.quantity + 1);
    }
  };

  const handleDecrementQuantity = (dish) => {
    const existingItem = cartItems.find(item => item.id === dish.id);
    if (existingItem && existingItem.quantity > 1) {
      updateCartItemQuantity(dish.id, existingItem.quantity - 1);
    } else if (existingItem && existingItem.quantity === 1) {
      removeFromCart(dish.id);
    }
  };

  const getItemQuantity = useCallback((dishId) => {
    const item = cartItems.find(item => item.id === dishId);
    return item ? item.quantity : 0;
  }, [cartItems]);

  const goToCart = () => {
    try { navigate(generateContextualUrl(urlParams, 'cart')); } 
    catch (error) { navigate('/tableserve'); }
  };

  const handleDishClick = (dish) => {
    // OPTIMIZATION 4: Batch state resets to prevent rapid multi-rendering before popup opens
    setSelectedModifiers({});
    
    // Auto-select default variants
    const dishVariants = variants.filter(v => v.menuItems?.includes(dish.id));
    const defaultVariants = {};
    dishVariants.forEach(variant => {
      const defaultOption = variant.options.find(opt => opt.isDefault);
      if (defaultOption) {
        const optionId = defaultOption._id || defaultOption.id;
        defaultVariants[variant.id] = [optionId];
      }
    });
    
    setSelectedVariants(defaultVariants);
    setSelectedDish(dish);
    setShowDetailPopup(true);
  };

  const closeDetailPopup = () => {
    setShowDetailPopup(false);
    setTimeout(() => {
      // Clear data after animation finishes so it doesn't pop blank before sliding down
      setSelectedDish(null);
      setSelectedModifiers({});
      setSelectedVariants({});
    }, 300);
  };

  const handleModifierChange = (modifierId, optionId, isChecked, type) => {
    setSelectedModifiers(prev => {
      const newState = { ...prev };
      if (type === 'single') newState[modifierId] = isChecked ? [optionId] : [];
      else {
        const current = newState[modifierId] || [];
        newState[modifierId] = isChecked ? [...current, optionId] : current.filter(id => id !== optionId);
      }
      return newState;
    });
  };

  const handleVariantChange = (variantId, optionId, isChecked, type) => {
    setSelectedVariants(prev => {
      const newState = { ...prev };
      if (type === 'single') newState[variantId] = isChecked ? [optionId] : [];
      else {
        const current = newState[variantId] || [];
        newState[variantId] = isChecked ? [...current, optionId] : current.filter(id => id !== optionId);
      }
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 relative pb-safe font-sans selection:bg-accent/20">
      <Navbar showBackButton={true} restaurantId={restaurantId || shopId || ''} tableNumber={tableId || ''} />

      {/* Search Bar */}
      <div className="relative mb-6 mt-6 px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="relative group">
          <input
            type="text"
            placeholder="Search for delicious dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4 pl-12 pr-12 rounded-2xl bg-white border border-slate-200 text-slate-800 text-base placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300"
          />
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-accent transition-colors" />
          {searchQuery && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full">
              <MdClose size={16} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 sm:px-6 mb-2 max-w-3xl mx-auto sticky top-0 z-30 bg-white/95 backdrop-blur-md pt-2 pb-3 border-b border-slate-100">
        <div className="flex space-x-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {allCategories.map((category) => (
            <motion.button
              key={category.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedCategory(category.id)}
              className={`relative px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 border ${selectedCategory === category.id ? 'bg-accent text-white border-accent shadow-md shadow-accent/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
            >
              <span className="relative z-10">{category.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-accent rounded-full animate-spin mb-6" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">Loading Menu</h3>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4"><MdOutlineRamenDining className="text-3xl text-red-500" /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Menu Unavailable</h3>
            <p className="text-slate-500 mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold shadow-sm hover:bg-slate-50 transition-all">Try Again</button>
          </div>
        ) : groupedDishes.length > 0 ? (
          <div className="pb-32">
            {groupedDishes.map(([categoryName, dishes]) => (
              <div key={categoryName} className="bg-white">
                <div className="px-4 sm:px-6 py-4 mt-2">
                  <h2 className="text-[22px] font-black text-slate-900 tracking-tight">{categoryName} <span className="text-base font-semibold text-slate-500 ml-1">({dishes.length})</span></h2>
                </div>
                <div className="flex flex-col px-4 sm:px-6">
                  {dishes.map((dish, index) => (
                    <div key={dish.id} className={`flex justify-between gap-4 py-6 bg-white ${index !== dishes.length - 1 ? 'border-b border-dashed border-slate-200' : ''}`}>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className={`w-4 h-4 border flex items-center justify-center rounded-[3px] ${dish.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                            <div className={`w-2 h-2 rounded-full ${dish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                          </div>
                          {dish.isSpicy && (
                            <span className="text-sm leading-none" title="Spicy" aria-label="Spicy">🌶️</span>
                          )}
                        </div>
                        <h3 className="text-[17px] font-bold text-slate-800 leading-tight mb-1 cursor-pointer hover:text-accent transition-colors" onClick={() => handleDishClick(dish)}>{dish.name}</h3>
                        <div className="font-black text-[19px] text-slate-900 mb-2">₹{dish.price.toFixed(2)}</div>
                        {(modifiers.filter(mod => mod.menuItems?.includes(dish.id)).length > 0 || variants.filter(v => v.menuItems?.includes(dish.id)).length > 0) && (
                          <div className="inline-flex mb-2 px-2 py-0.5 bg-orange-50 text-accent text-[10px] font-bold uppercase tracking-wider rounded">Customizable</div>
                        )}
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{dish.description}</p>
                      </div>

                      <div className="relative w-[130px] shrink-0 flex flex-col items-center">
                        <div className="w-full h-[130px] rounded-2xl overflow-hidden shadow-sm bg-slate-50 cursor-pointer border border-slate-100" onClick={() => handleDishClick(dish)}>
                          {/* OPTIMIZATION 5: Added lazy loading and async decoding to list images */}
                          <img src={dish.image} alt={dish.name} loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                          {!dish.available && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                              <span className="text-slate-800 font-bold text-[10px] uppercase tracking-wider bg-white px-2 py-1 rounded shadow-sm">Unavailable</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[110px] z-10">
                          {getItemQuantity(dish.id) > 0 ? (
                            <div className="flex items-center justify-between bg-white text-accent rounded-xl border border-slate-200 shadow-md font-extrabold text-sm h-[38px] px-1 overflow-hidden">
                              <button onClick={() => handleDecrementQuantity(dish)} className="p-2 hover:bg-orange-50 flex-1 flex justify-center transition-colors"><FaMinus size={12} /></button>
                              <span className="w-6 text-center text-slate-800">{getItemQuantity(dish.id)}</span>
                              <button onClick={() => handleIncrementQuantity(dish)} className="p-2 hover:bg-orange-50 flex-1 flex justify-center transition-colors"><FaPlus size={12} /></button>
                            </div>
                          ) : (
                            <button onClick={() => handleAddToCart(dish)} disabled={!dish.available} className={`w-full h-[38px] bg-white text-accent rounded-xl border border-slate-200 shadow-md font-extrabold text-[15px] tracking-wide transition-all ${dish.available ? 'hover:bg-orange-50 hover:shadow-lg' : 'opacity-80 text-slate-400 cursor-not-allowed'}`}>ADD</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-3 w-full bg-slate-100 mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100"><FaUtensils className="text-3xl text-slate-300" /></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Dishes Found</h3>
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold shadow-md mt-4">Clear Search</button>
            )}
          </div>
        )}
      </div>

      {/* Floating Cart Button - Always visible, improved design */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <motion.button 
              whileTap={{ scale: 0.98 }} 
              onClick={goToCart} 
              className="w-full flex items-center justify-between bg-accent text-white px-5 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <FaShoppingCart className="text-lg" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {cartItemCount}
                  </span>
                </div>
                <div className="text-left">
                  <div className="font-bold text-base leading-tight">View Cart</div>
                  <div className="text-white/90 text-xs font-medium">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-black text-lg leading-tight">₹{cartTotal.toFixed(2)}</div>
                  <div className="text-white/80 text-[10px] font-semibold uppercase tracking-wide">Total</div>
                </div>
                <FaArrowLeft className="rotate-180 text-base ml-1" />
              </div>
            </motion.button>
          </div>
        </div>
      )}

      {/* Detail Bottom Sheet - OPTIMIZED: Removed backdrop-blur and reduced animation complexity */}
      <AnimatePresence mode="wait">
        {showDetailPopup && selectedDish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/60 z-50 flex items-end justify-center sm:items-center sm:p-4"
            onClick={closeDetailPopup}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              // OPTIMIZATION: Faster, simpler animation - removed complex easing
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl will-change-transform"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-64 shrink-0 bg-slate-100">
                {/* OPTIMIZATION: Eager loading for popup image since it's immediately visible */}
                <img 
                  src={selectedDish.image} 
                  alt={selectedDish.name} 
                  loading="eager"
                  decoding="async" 
                  className="w-full h-full object-cover" 
                />
                <button 
                  onClick={closeDetailPopup} 
                  className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <MdClose size={20} />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-6 flex-grow pb-36 overscroll-contain">
                <div className="flex justify-between items-start mb-2">
                  <div className="pr-4">
                     <div className="flex items-center gap-1.5 mb-2">
                       <div className={`w-4 h-4 border flex items-center justify-center rounded-[3px] ${selectedDish.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${selectedDish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                       </div>
                       {selectedDish.isSpicy && (
                         <span className="text-base leading-none" title="Spicy" aria-label="Spicy">🌶️</span>
                       )}
                     </div>
                     <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">{selectedDish.name}</h2>
                  </div>
                  <span className="text-xl font-black text-slate-900 whitespace-nowrap mt-6">₹{selectedDish.price.toFixed(2)}</span>
                </div>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{selectedDish.description}</p>

                {/* Variants - OPTIMIZED: Removed transition-all from labels */}
                {currentDishVariants.map(variant => (
                  <div key={variant.id} className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-slate-900">{variant.name} {variant.required && <span className="text-red-500">*</span>}</h4>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Required</span>
                    </div>
                    <div className="space-y-2">
                      {variant.options.map((option, index) => {
                        const optionId = option._id || option.id || index;
                        const isSelected = selectedVariants[variant.id]?.includes(optionId) || false;
                        const isDefault = option.isDefault && !selectedVariants[variant.id];
                        return (
                          <label key={optionId} className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer ${isSelected || isDefault ? 'border-accent bg-orange-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected || isDefault ? 'border-accent' : 'border-slate-300'}`}>
                                {(isSelected || isDefault) && <div className="w-2 h-2 bg-accent rounded-full" />}
                              </div>
                              <input type={variant.type === 'single' ? 'radio' : 'checkbox'} className="hidden" checked={isSelected || isDefault} onChange={(e) => handleVariantChange(variant.id, optionId, e.target.checked, variant.type)} />
                              <span className="font-medium text-sm text-slate-700">{option.name}</span>
                            </div>
                            <span className="font-semibold text-sm text-slate-900">₹{option.price.toFixed(2)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Modifiers - OPTIMIZED: Removed transition-all from labels */}
                {currentDishModifiers.map(modifier => (
                  <div key={modifier.id} className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-slate-900">{modifier.name} {modifier.required && <span className="text-red-500">*</span>}</h4>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Optional</span>
                    </div>
                    <div className="space-y-2">
                      {modifier.options.map((option, index) => {
                        const optionId = option._id || option.id || index;
                        const isSelected = selectedModifiers[modifier.id]?.includes(optionId) || false;
                        return (
                          <label key={optionId} className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer ${isSelected ? 'border-accent bg-orange-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <input type={modifier.type === 'single' ? 'radio' : 'checkbox'} className="hidden" checked={isSelected} onChange={(e) => handleModifierChange(modifier.id, optionId, e.target.checked, modifier.type)} />
                              <span className="font-medium text-sm text-slate-700">{option.name}</span>
                            </div>
                            {option.price > 0 && <span className="font-semibold text-sm text-slate-600">+₹{option.price.toFixed(2)}</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-4 left-0 right-0 bg-white border-t border-slate-100 p-4 sm:p-6 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                {!selectedDish.available ? (
                  <div className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl text-base font-bold flex items-center justify-center border border-slate-200">
                    Out of Stock
                  </div>
                ) : getItemQuantity(selectedDish.id) > 0 ? (
                  <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-2 border border-slate-100">
                    <button onClick={() => handleDecrementQuantity(selectedDish)} className="w-12 h-12 rounded-xl bg-white text-accent flex items-center justify-center shadow-sm border border-slate-200"><FaMinus /></button>
                    <span className="text-xl font-bold text-slate-900 w-12 text-center">{getItemQuantity(selectedDish.id)}</span>
                    <button onClick={() => handleIncrementQuantity(selectedDish)} className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center shadow-sm"><FaPlus /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => { handleAddToCart(selectedDish, selectedModifiers, selectedVariants); closeDetailPopup(); }}
                    className="w-full py-4 bg-accent text-white rounded-2xl text-base font-bold shadow-[0_8px_20px_rgba(255,107,0,0.25)] hover:shadow-[0_8px_25px_rgba(255,107,0,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <span>Add item</span>
                    <span className="w-1 h-1 bg-white/40 rounded-full mx-1" />
                    <span>₹{calculateItemPrice(selectedDish, selectedModifiers, selectedVariants).toFixed(2)}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <BrandFooter />
    </div>
  );
};

export default DigitalMenuScreen;