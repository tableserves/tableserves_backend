import React, { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaMinus, FaTrash, FaArrowLeft, FaShoppingCart } from 'react-icons/fa';
import { MdOutlineRamenDining } from "react-icons/md";
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { generateContextualUrl } from '../../utils/urlUtils';
import { CustomerErrorBoundary, CartErrorBoundary } from '../../components/customer/CustomerErrorBoundary';
import { EmptyState, InlineLoading } from '../../components/customer/LoadingStates';
import logger from '../../services/LoggingService';

const CartScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();
  
  // Use the enhanced cart hook
  const { 
    cartItems, 
    removeFromCart, 
    updateCartItemQuantity,
    getCartTotal,
    isCartEmpty,
    cartMetadata
  } = useCart();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const urlParams = { restaurantId, tableId, userId, zoneId };

  // Enhanced debug logging
  React.useEffect(() => {
    logger.debug('CartScreen mounted', {
      params: urlParams,
      cartScope: cartMetadata?.scope,
      itemCount: cartItems.length
    }, 'CartScreen');
  }, []);

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
        removeFromCart(id);
        logger.debug('Item removed from cart', { itemId: id }, 'CartScreen');
      }
    } catch (error) {
      logger.error('Failed to update cart item quantity', error, 'CartScreen');
    } finally {
      // Small delay to show loading state
      setTimeout(() => setIsUpdating(false), 200);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setDeletingItemId(itemId);
    
    try {
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
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
      // Fallback navigation
      navigate(-1);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <CustomerErrorBoundary 
      context={{ component: 'CartScreen', params: urlParams }}
      onError={(error) => {
        logger.error('CartScreen error boundary triggered', error, 'CartScreen');
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 text-gray-900 relative pb-safe">
        {/* Mobile-First Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleGoBack}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-accent to-red-500 rounded-full shadow-lg flex items-center justify-center touch-manipulation"
              >
                <FaArrowLeft className="text-white text-sm sm:text-base" />
              </motion.button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-fredoka">My Cart</h1>
                {cartMetadata?.scope && (
                  <p className="text-xs sm:text-sm text-gray-500 font-raleway">
                    {cartMetadata.scope.type === 'restaurant' ? 'Restaurant' : 'Zone'} • Table {tableId}
                  </p>
                )}
              </div>
            </div>
            
            {cartItems.length > 0 && (
              <div className="text-right">
                <p className="text-xs sm:text-sm text-gray-500 font-raleway">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}</p>
                <p className="text-lg sm:text-xl font-bold text-accent font-fredoka">₹{calculateTotal()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Responsive Cart Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <CartErrorBoundary
            onError={(error) => {
              logger.error('Cart content error', error, 'CartScreen');
            }}
          >
            {isCartEmpty() ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-20">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 sm:mb-8 shadow-lg">
                  <FaShoppingCart className="text-4xl sm:text-5xl text-gray-400" />
                </div>
                <div className="text-center max-w-sm">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-600 mb-3 sm:mb-4 font-fredoka">Your Cart is Empty</h3>
                  <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 font-raleway leading-relaxed">
                    Looks like you haven't added any delicious items yet. Start exploring our menu!
                  </p>
                  <div className="flex justify-center">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGoBack}
                      className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-accent to-red-500 text-white rounded-2xl font-bold font-raleway shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 touch-manipulation"
                    >
                      <MdOutlineRamenDining className="text-lg sm:text-xl" />
                      <span>Continue Shopping</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {/* Loading State */}
                {isUpdating && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 flex items-center space-x-3"
                  >
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-700 font-medium font-raleway text-sm sm:text-base">Updating cart...</span>
                  </motion.div>
                )}
                
                {/* Cart Items */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  {cartItems.map((item, index) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ 
                        opacity: deletingItemId === item.id ? 0.5 : 1, 
                        x: deletingItemId === item.id ? -100 : 0,
                        scale: deletingItemId === item.id ? 0.95 : 1
                      }}
                      exit={{ opacity: 0, x: -100, scale: 0.9 }}
                      transition={{ 
                        delay: deletingItemId === item.id ? 0 : index * 0.05,
                        duration: deletingItemId === item.id ? 0.3 : 0.2
                      }}
                      className="flex items-center p-4 sm:p-6 border-b border-gray-100 last:border-b-0 relative overflow-hidden"
                    >
                      {/* Deleting Overlay */}
                      {deletingItemId === item.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-red-500/10 backdrop-blur-sm flex items-center justify-center z-10"
                        >
                          <div className="flex items-center space-x-2 text-red-600">
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-medium font-raleway">Removing...</span>
                          </div>
                        </motion.div>
                      )}
                      {/* Item Image */}
                      <div className="relative">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl sm:rounded-2xl shadow-md" 
                          onError={(e) => {
                            e.target.src = '/placeholder-food.jpg';
                          }}
                        />
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 ml-4 sm:ml-6">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 font-fredoka line-clamp-2 mb-1">
                          {item.name}
                        </h3>
                        <p className="text-lg sm:text-xl font-bold text-accent font-fredoka mb-1">
                          ₹{item.price.toFixed(2)}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 font-raleway">
                          Subtotal: ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex flex-col items-end space-y-3">
                        {/* Quantity Adjuster */}
                        <div className="flex items-center bg-gray-50 rounded-xl p-1">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={isUpdating}
                            className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-accent to-red-500 text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-50 touch-manipulation"
                          >
                            <FaMinus className="text-xs" />
                          </motion.button>
                          <span className="text-base sm:text-lg font-bold text-gray-800 font-fredoka mx-3 sm:mx-4 min-w-[1.5rem] sm:min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={isUpdating}
                            className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-accent to-red-500 text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-50 touch-manipulation"
                          >
                            <FaPlus className="text-xs" />
                          </motion.button>
                        </div>
                        
                        {/* Remove Button */}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isUpdating || deletingItemId === item.id}
                          className="w-8 h-8 sm:w-9 sm:h-9 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-50 touch-manipulation relative overflow-hidden"
                        >
                          {deletingItemId === item.id ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <FaTrash className="text-xs" />
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Enhanced Total Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-base sm:text-lg font-bold text-gray-800 font-raleway">
                        Total ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}):
                      </span>
                      <span className="text-2xl sm:text-3xl font-bold text-accent font-fredoka">
                        ₹{calculateTotal()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 font-raleway text-right">
                      Taxes and delivery charges may apply
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CartErrorBoundary>
        </div>

        {/* Responsive Sticky Checkout Button */}
        {!isCartEmpty() && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 sm:p-6 z-20">
            <div className="max-w-md mx-auto">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleProceedToCheckout}
                disabled={isUpdating}
                className="w-full bg-gradient-to-r from-accent to-red-500 text-white py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-bold font-fredoka text-lg sm:text-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 sm:space-x-3 touch-manipulation"
              >
                {isUpdating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <FaShoppingCart className="text-lg sm:text-xl" />
                    <span>Proceed to Checkout • ₹{calculateTotal()}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}
        
        {/* Bottom Spacing for Sticky Button */}
        {!isCartEmpty() && (
          <div className="h-20 sm:h-24"></div>
        )}
      </div>
    </CustomerErrorBoundary>
  );
};

export default CartScreen;