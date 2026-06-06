import React, { useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaMinus, FaTrash, FaArrowLeft, FaShoppingCart, FaArrowRight, FaEdit } from 'react-icons/fa';
import { MdOutlineRamenDining, MdClose } from "react-icons/md";
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useCart } from '../../context/CartContext.jsx';
import { generateContextualUrl } from '../../../../shared/routing/urlUtils.js';
import { CustomerErrorBoundary, CartErrorBoundary } from '../../components/common/CustomerErrorBoundary.jsx';
import { fetchMenuModifiers, fetchMenuVariants } from '../../../../store/slices/menuSlice.js';
import logger from '../../../../services/LoggingService.js';

// --- Clean Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  },
  exit: { opacity: 0, x: -50, scale: 0.95, transition: { duration: 0.2 } }
};

const ZoneCartScreen = () => {
  const { restaurantId, tableId, userId, shopId, zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Use the enhanced cart hook
  const {
    cartItems,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItem,
    addToCart,
    getCartTotal,
    isCartEmpty,
    cartMetadata
  } = useCart();

  // Get modifiers and variants from Redux store
  const { modifiers, variants } = useSelector((state) => ({
    modifiers: Array.isArray(state.menu.modifiers) ? state.menu.modifiers : [],
    variants: Array.isArray(state.menu.variants) ? state.menu.variants : []
  }));

  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  const urlParams = { restaurantId, tableId, userId, zoneId, shopId: shopId || (cartItems.length > 0 ? cartItems[0].shopId : undefined) };

  // Enhanced debug logging
  useEffect(() => {
    logger.debug('CartScreen mounted', {
      params: urlParams,
      cartScope: cartMetadata?.scope,
      itemCount: cartItems.length
    }, 'CartScreen');
  }, []);

  // Fetch modifiers and variants for the restaurant
  useEffect(() => {
    const actualShopId = shopId || (cartItems.length > 0 ? cartItems[0].shopId : null);
    
    if (restaurantId) {
      dispatch(fetchMenuModifiers({ entityId: restaurantId, entityType: 'restaurant' }));
      dispatch(fetchMenuVariants({ entityId: restaurantId, entityType: 'restaurant' }));
    } else if (actualShopId && zoneId) {
      dispatch(fetchMenuModifiers({ entityId: actualShopId, entityType: 'vendor' }));
      dispatch(fetchMenuVariants({ entityId: actualShopId, entityType: 'vendor' }));
    }
  }, [restaurantId, shopId, zoneId, dispatch, cartItems]);

  // Debug log to see what modifiers and variants are loaded
  useEffect(() => {
    logger.debug('Modifiers and variants loaded', {
      modifiersCount: modifiers.length,
      variantsCount: variants.length,
      modifiers: modifiers.map(m => ({ id: m.id, name: m.name, menuItems: m.menuItems })),
      variants: variants.map(v => ({ id: v.id, name: v.name, menuItems: v.menuItems }))
    }, 'CartScreen');
  }, [modifiers, variants]);

  const updateQuantity = async (id, delta) => {
    const item = cartItems.find(item => item.id === id);
    if (!item) return;

    setIsUpdating(true);

    try {
      const newQuantity = item.quantity + delta;

      if (newQuantity > 0) {
        updateCartItemQuantity(id, newQuantity);
        logger.debug('Cart item quantity updated', {
          itemId: id,
          oldQuantity: item.quantity,
          newQuantity
        }, 'CartScreen');
      } else {
        setDeletingItemId(id);
        await new Promise(resolve => setTimeout(resolve, 200)); // Small animation delay
        removeFromCart(id);
        logger.debug('Item removed from cart', { itemId: id }, 'CartScreen');
      }
    } catch (error) {
      logger.error('Failed to update cart item quantity', error, 'CartScreen');
    } finally {
      setTimeout(() => {
        setIsUpdating(false);
        setDeletingItemId(null);
      }, 200);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setDeletingItemId(itemId);
    try {
      await new Promise(resolve => setTimeout(resolve, 250)); // Animation delay
      removeFromCart(itemId);
      logger.debug('Item removed from cart', { itemId }, 'CartScreen');
    } catch (error) {
      logger.error('Failed to remove item from cart', error, 'CartScreen');
    } finally {
      setDeletingItemId(null);
    }
  };

  const calculateTotal = () => {
    return getCartTotal().toFixed(2);
  };

  const handleProceedToCheckout = () => {
    try {
      const checkoutRoute = generateContextualUrl(urlParams, 'checkout');

      logger.route('CartScreen - proceeding to checkout', checkoutRoute, {
        params: urlParams,
        cartItemCount: cartItems.length,
        total: getCartTotal()
      });

      navigate(checkoutRoute);
    } catch (error) {
      logger.error('Failed to navigate to checkout', error, 'CartScreen');
      navigate(-1);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleEditItem = (item) => {
    logger.debug('Edit item clicked', {
      itemId: item.id,
      itemName: item.name,
      availableModifiers: modifiers.filter(m => m.menuItems?.includes(item.id)),
      availableVariants: variants.filter(v => v.menuItems?.includes(item.id))
    }, 'CartScreen');
    
    setEditingItem(item);
    // Pre-populate selections with current item's modifiers and variants
    setSelectedModifiers(item.modifiers || {});
    setSelectedVariants(item.variants || {});
  };

  const closeEditPopup = () => {
    setEditingItem(null);
    setSelectedModifiers({});
    setSelectedVariants({});
  };

  const handleModifierChange = (modifierId, optionId, isChecked, type) => {
    setSelectedModifiers(prev => {
      if (type === 'single') {
        return { ...prev, [modifierId]: isChecked ? [optionId] : [] };
      } else {
        const current = prev[modifierId] || [];
        if (isChecked) {
          return { ...prev, [modifierId]: [...current, optionId] };
        } else {
          return { ...prev, [modifierId]: current.filter(id => id !== optionId) };
        }
      }
    });
  };

  const handleVariantChange = (variantId, optionId, isChecked, type) => {
    setSelectedVariants(prev => {
      if (type === 'single') {
        return { ...prev, [variantId]: isChecked ? [optionId] : [] };
      } else {
        const current = prev[variantId] || [];
        if (isChecked) {
          return { ...prev, [variantId]: [...current, optionId] };
        } else {
          return { ...prev, [variantId]: current.filter(id => id !== optionId) };
        }
      }
    });
  };

  const calculateItemPrice = (item, modifierSelections = {}, variantSelections = {}) => {
    // Start with base price
    let basePrice = item.basePrice || item.price;
    let finalPrice = basePrice;

    logger.debug('Starting price calculation', {
      itemId: item.id,
      itemName: item.name,
      basePrice,
      modifierSelections,
      variantSelections,
      availableModifiers: modifiers.length,
      availableVariants: variants.length
    }, 'CartScreen');

    // Handle variants first - variants REPLACE the base price (not add to it)
    let variantPriceApplied = false;
    Object.entries(variantSelections).forEach(([variantId, selectedOptions]) => {
      if (!selectedOptions || selectedOptions.length === 0) return;
      
      const variant = variants.find(v => {
        const vId = v._id || v.id;
        return String(vId) === String(variantId);
      });
      
      if (variant) {
        logger.debug('Found variant', {
          variantId,
          variantName: variant.name,
          variantType: variant.type,
          selectedOptions
        }, 'CartScreen');
        
        // For single selection variants, use the first selected option
        const selectedOptionId = selectedOptions[0];
        const option = variant.options.find(o => {
          const optId = o._id || o.id;
          return String(optId) === String(selectedOptionId);
        });
        
        if (option) {
          logger.debug('Applying variant price', {
            optionId: selectedOptionId,
            optionName: option.name,
            optionPrice: option.price,
            replacingBasePrice: basePrice
          }, 'CartScreen');
          
          // Variant price REPLACES base price
          finalPrice = Number(option.price) || 0;
          variantPriceApplied = true;
        }
      }
    });

    // Add modifier prices on top of base/variant price
    let modifierTotal = 0;
    Object.entries(modifierSelections).forEach(([modifierId, selectedOptions]) => {
      if (!selectedOptions || selectedOptions.length === 0) return;
      
      const modifier = modifiers.find(m => {
        const mId = m._id || m.id;
        return String(mId) === String(modifierId);
      });
      
      if (modifier) {
        logger.debug('Found modifier', {
          modifierId,
          modifierName: modifier.name,
          modifierType: modifier.type,
          selectedOptions
        }, 'CartScreen');
        
        selectedOptions.forEach(optionId => {
          const option = modifier.options.find(o => {
            const optId = o._id || o.id;
            return String(optId) === String(optionId);
          });
          
          if (option) {
            const optionPrice = Number(option.price) || 0;
            if (optionPrice > 0) {
              logger.debug('Adding modifier price', {
                optionId,
                optionName: option.name,
                optionPrice
              }, 'CartScreen');
              
              modifierTotal += optionPrice;
            }
          }
        });
      }
    });

    finalPrice += modifierTotal;

    logger.debug('Price calculation complete', {
      itemId: item.id,
      basePrice,
      variantPriceApplied,
      modifierTotal,
      finalPrice
    }, 'CartScreen');

    return finalPrice;
  };

  const handleSaveCustomization = () => {
    if (!editingItem) return;

    const updatedPrice = calculateItemPrice(editingItem, selectedModifiers, selectedVariants);
    
    // Update the cart item with new customizations
    updateCartItem(editingItem.id, {
      price: updatedPrice,
      modifiers: selectedModifiers,
      variants: selectedVariants
    });

    logger.debug('Cart item customization updated', {
      itemId: editingItem.id,
      newPrice: updatedPrice
    }, 'CartScreen');

    closeEditPopup();
  };

  const defaultImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOWNhM2FmIj5Gb29kIEl0ZW08L3RleHQ+PC9zdmc+';

  return (
    <CustomerErrorBoundary
      context={{ component: 'CartScreen', params: urlParams }}
      onError={(error) => {
        logger.error('CartScreen error boundary triggered', error, 'CartScreen');
      }}
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 relative pb-safe font-sans selection:bg-accent/20">

        {/* Premium Frosted Glass Header (Accent Theme) */}
        <div className="sticky top-0 bg-accent shadow-[0_4px_20px_-5px_rgba(0,0,0,0.15)] border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 z-20">
          <div className="max-w-md mx-auto flex items-center justify-between min-h-[50px]">

            {/* Left Side - Back Button & Title */}
            <div className="flex items-center gap-3 overflow-hidden pr-2">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleGoBack}
                className="w-10 h-10 rounded-full bg-white/15 border border-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors backdrop-blur-md shadow-sm flex-shrink-0"
              >
                <FaArrowLeft className="text-[15px]" />
              </motion.button>

              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-[1.3rem] sm:text-[1.5rem] font-extrabold text-white tracking-tight leading-none drop-shadow-sm truncate">
                  My Cart
                </h1>
                <p className="text-[10px] sm:text-[11px] font-bold text-white/85 uppercase tracking-widest mt-1.5 flex items-center gap-1.5 truncate">
                  <span className="truncate">Food Zone</span>
                  {/* Native App-Style Separator Dot */}
                  <span className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0" />
                  <span className="flex-shrink-0">Table {tableId}</span>
                </p>
              </div>
            </div>

            {/* Right Side - Item Count & Total */}
            {cartItems.length > 0 && (
              <div className="text-right flex flex-col justify-center flex-shrink-0 pl-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-white/85 uppercase tracking-widest mb-0.5">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </p>
                <p className="text-lg sm:text-xl font-black text-white leading-none drop-shadow-sm">
                  ₹{calculateTotal()}
                </p>
              </div>
            )}

          </div>
        </div>
        {/* Main Content Area */}
        <div className="max-w-md mx-auto px-4 sm:px-5 py-6">
          <CartErrorBoundary
            onError={(error) => {
              logger.error('Cart content error', error, 'CartScreen');
            }}
          >
            {isCartEmpty() ? (
              /* Minimalist Empty State */
              <div className="flex flex-col items-center justify-center pt-20 pb-10 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100"
                >
                  <FaShoppingCart className="text-4xl text-slate-300" />
                </motion.div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Your cart is empty</h2>
                <p className="text-slate-500 font-medium mb-8 max-w-[250px] leading-relaxed">
                  Looks like you haven't added any delicious items yet.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGoBack}
                  className="bg-accent text-white px-8 py-3.5 rounded-2xl font-bold tracking-wide shadow-[0_8px_20px_-6px_var(--tw-shadow-color)] shadow-accent/40 hover:shadow-accent/60 transition-all duration-200 flex items-center gap-2"
                >
                  <MdOutlineRamenDining className="text-lg" />
                  <span>Browse Menu</span>
                </motion.button>
              </div>
            ) : (
              <div className="space-y-6">

                {/* Clean Updating Indicator */}
                <AnimatePresence>
                  {isUpdating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 flex items-center justify-center gap-3 mb-2">
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-600 font-bold text-sm">Updating cart...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Unified Cart Items List */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden"
                >
                  <AnimatePresence>
                    {cartItems.map((item, index) => (
                      <motion.div
                        variants={itemVariants}
                        key={item.id}
                        layout
                        className={`flex gap-4 p-5 bg-white relative overflow-hidden ${index !== cartItems.length - 1 ? 'border-b border-dashed border-slate-100' : ''}`}
                      >
                        {/* Deleting Overlay */}
                        <AnimatePresence>
                          {deletingItemId === item.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-10"
                            >
                              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Item Image */}
                        <div className="w-20 h-20 rounded-[1rem] bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                          <img
                            src={item.image && (item.image.startsWith('http') || item.image.startsWith('data')) ? item.image : defaultImage}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.onerror = null; e.target.src = defaultImage; }}
                          />
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h3 className="font-bold text-slate-800 text-[1rem] leading-tight line-clamp-2">
                              {item.name}
                            </h3>
                            <div className="flex gap-1 flex-shrink-0">
                              {/* Edit Button - Always show for now to debug */}
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => handleEditItem(item)}
                                disabled={isUpdating || deletingItemId === item.id}
                                className="p-2 -mr-1 -mt-1 text-slate-400 hover:text-accent hover:bg-orange-50 rounded-lg transition-colors"
                                title={`Edit ${item.name} - Modifiers: ${modifiers.filter(m => m.menuItems?.includes(item.id)).length}, Variants: ${variants.filter(v => v.menuItems?.includes(item.id)).length}`}
                              >
                                <FaEdit className="text-[13px]" />
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isUpdating || deletingItemId === item.id}
                                className="p-2 -mr-2 -mt-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <FaTrash className="text-[13px]" />
                              </motion.button>
                            </div>
                          </div>

                          {/* Modifiers Note */}
                          {((item.modifiers && Object.keys(item.modifiers).length > 0) || 
                            (item.variants && Object.keys(item.variants).length > 0)) && (
                            <p className="text-[11px] font-semibold text-slate-400 mb-2 truncate">Customized</p>
                          )}

                          {/* Price & Quantity Controls */}
                          <div className="flex justify-between items-center mt-auto pt-1">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-[1.1rem]">₹{(item.price * item.quantity).toFixed(2)}</span>
                              {item.quantity > 1 && (
                                <span className="text-[10px] font-bold text-slate-400">₹{item.price.toFixed(2)} each</span>
                              )}
                            </div>

                            {/* Premium Pill Controls */}
                            <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100 shadow-sm">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={isUpdating}
                                className="w-7 h-7 rounded-lg bg-white text-slate-600 flex items-center justify-center hover:text-accent shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors disabled:opacity-50"
                              >
                                {item.quantity === 1 ? <FaTrash className="text-[10px] text-red-400" /> : <FaMinus className="text-[10px]" />}
                              </button>
                              <span className="w-8 text-center font-bold text-slate-800 text-[13px]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                disabled={isUpdating}
                                className="w-7 h-7 rounded-lg bg-white text-slate-600 flex items-center justify-center hover:text-accent shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors disabled:opacity-50"
                              >
                                <FaPlus className="text-[10px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>



              </div>
            )}
          </CartErrorBoundary>
        </div>

        {/* Sticky App-Style Bottom Checkout Bar */}
        {!isCartEmpty() && (
          <div className="fixed bottom-6 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 p-4  pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.06)] z-30">
            <div className="max-w-md mx-auto">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleProceedToCheckout}

                className="w-full flex items-center justify-center bg-gradient-to-r from-accent to-accent/90 text-white p-4 px-5 rounded-[1.25rem] shadow-[0_8px_24px_-6px_var(--tw-shadow-color)] shadow-accent/30 hover:shadow-accent/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed relative"
              >

                <div className="flex items-center justify-center gap-3 font-bold text-[1.1rem] tracking-wide w-full relative">
                  <span>Checkout</span>
                  <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                    <FaArrowRight className="text-[12px]" />
                  </div>
                </div>

              </motion.button>
            </div>
          </div>
        )}

        {/* Bottom Spacing to prevent content from hiding behind the sticky bar */}
        {!isCartEmpty() && <div className="h-28" />}

        {/* Edit Customization Modal */}
        <AnimatePresence>
          {editingItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={closeEditPopup}
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with Image */}
                <div className="relative h-48 shrink-0 bg-slate-100">
                  <img 
                    src={editingItem.image && (editingItem.image.startsWith('http') || editingItem.image.startsWith('data')) ? editingItem.image : defaultImage}
                    alt={editingItem.name} 
                    loading="eager"
                    className="w-full h-full object-cover" 
                    onError={(e) => { e.target.onerror = null; e.target.src = defaultImage; }}
                  />
                  <button 
                    onClick={closeEditPopup} 
                    className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <MdClose size={20} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto px-6 py-6 flex-grow pb-32 overscroll-contain">
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-4">
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-1">
                        {editingItem.name}
                      </h2>
                      <p className="text-sm text-slate-500">Edit your customization</p>
                    </div>
                    <span className="text-xl font-black text-slate-900 whitespace-nowrap">
                      ₹{(editingItem.basePrice || editingItem.price).toFixed(2)}
                    </span>
                  </div>

                  {/* Show message if no customization options available */}
                  {variants.filter(variant => variant.menuItems?.includes(editingItem.id)).length === 0 &&
                   modifiers.filter(modifier => modifier.menuItems?.includes(editingItem.id)).length === 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                      <p className="text-slate-600 font-medium mb-2">No customization options available</p>
                      <p className="text-sm text-slate-500">This item doesn't have any modifiers or variants to customize.</p>
                    </div>
                  )}

                  {/* Variants */}
                  {variants
                    .filter(variant => variant.menuItems?.includes(editingItem.id))
                    .map(variant => (
                      <div key={variant.id} className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-bold text-slate-900">
                            {variant.name} {variant.required && <span className="text-red-500">*</span>}
                          </h4>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            {variant.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {variant.options.map((option, index) => {
                            const optionId = option._id || option.id || index;
                            const isSelected = selectedVariants[variant.id]?.includes(optionId) || false;
                            const isDefault = option.isDefault && !selectedVariants[variant.id];
                            return (
                              <label 
                                key={optionId} 
                                className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-colors ${
                                  isSelected || isDefault 
                                    ? 'border-accent bg-orange-50/50' 
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected || isDefault ? 'border-accent' : 'border-slate-300'
                                  }`}>
                                    {(isSelected || isDefault) && <div className="w-2 h-2 bg-accent rounded-full" />}
                                  </div>
                                  <input 
                                    type={variant.type === 'single' ? 'radio' : 'checkbox'} 
                                    className="hidden" 
                                    checked={isSelected || isDefault} 
                                    onChange={(e) => handleVariantChange(variant.id, optionId, e.target.checked, variant.type)} 
                                  />
                                  <span className="font-medium text-sm text-slate-700">{option.name}</span>
                                </div>
                                <span className="font-semibold text-sm text-slate-900">₹{option.price.toFixed(2)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                  {/* Modifiers */}
                  {modifiers
                    .filter(modifier => modifier.menuItems?.includes(editingItem.id))
                    .map(modifier => (
                      <div key={modifier.id} className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-bold text-slate-900">
                            {modifier.name} {modifier.required && <span className="text-red-500">*</span>}
                          </h4>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            {modifier.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {modifier.options.map((option, index) => {
                            const optionId = option._id || option.id || index;
                            const isSelected = selectedModifiers[modifier.id]?.includes(optionId) || false;
                            return (
                              <label 
                                key={optionId} 
                                className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'border-accent bg-orange-50/50' 
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                    isSelected ? 'bg-accent border-accent' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <input 
                                    type={modifier.type === 'single' ? 'radio' : 'checkbox'} 
                                    className="hidden" 
                                    checked={isSelected} 
                                    onChange={(e) => handleModifierChange(modifier.id, optionId, e.target.checked, modifier.type)} 
                                  />
                                  <span className="font-medium text-sm text-slate-700">{option.name}</span>
                                </div>
                                {option.price > 0 && (
                                  <span className="font-semibold text-sm text-slate-600">+₹{option.price.toFixed(2)}</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Fixed Bottom Button */}
                <div className="absolute bottom-4 left-0 right-0 bg-white border-t border-slate-100 p-4 sm:p-6 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveCustomization}
                    className="w-full py-4 bg-gradient-to-r from-accent to-accent/90 text-white rounded-2xl text-base font-bold shadow-[0_8px_20px_rgba(255,107,0,0.25)] hover:shadow-[0_8px_25px_rgba(255,107,0,0.35)] flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Update item</span>
                    <span className="w-1 h-1 bg-white/40 rounded-full mx-1" />
                    <span>₹{(calculateItemPrice(editingItem, selectedModifiers, selectedVariants) * editingItem.quantity).toFixed(2)}</span>
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </CustomerErrorBoundary>
  );
};

export default ZoneCartScreen;