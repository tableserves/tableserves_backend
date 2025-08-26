import React, { useContext, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaMinus, FaTrash, FaStore, FaShoppingCart } from 'react-icons/fa';
import ZoneUserLayout from './ZoneUserLayout';
import ZoneUserNavbar from './ZoneUserNavbar';
import { CartContext } from '../../context/CartContext.jsx';
import { generateZoneUrl } from '../../utils/urlUtils';

const ZoneCartScreen = () => {
  const { zoneId, tableId, userId } = useParams();
  const navigate = useNavigate();
  const { cartItems, updateCartItemQuantity, removeFromCart, clearCart } = useContext(CartContext);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Group cart items by shop
  const groupedCartItems = cartItems.reduce((groups, item) => {
    const shopId = item.shopId;
    if (!groups[shopId]) {
      groups[shopId] = {
        shopName: item.shopName,
        items: [],
        total: 0
      };
    }
    groups[shopId].items.push(item);
    groups[shopId].total += item.price * item.quantity;
    return groups;
  }, {});

  // Calculate totals
  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  // Handle quantity changes
  const handleIncrementQuantity = (itemId) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item) {
      updateCartItemQuantity(itemId, item.quantity + 1);
    }
  };

  const handleDecrementQuantity = (itemId) => {
    const item = cartItems.find(item => item.id === itemId);
    if (item && item.quantity > 1) {
      updateCartItemQuantity(itemId, item.quantity - 1);
    } else if (item && item.quantity === 1) {
      removeFromCart(itemId);
    }
  };

  // Handle remove item
  const handleRemoveItem = (itemId) => {
    removeFromCart(itemId);
  };

  // Handle clear cart
  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  // Navigate to checkout
  const goToCheckout = () => {
    navigate(generateZoneUrl(zoneId, tableId, userId, 'checkout'));
  };

  // Navigate back to menu
  const goBackToMenu = () => {
    navigate(generateZoneUrl(zoneId, tableId, userId, 'menu'));
  };

  if (cartItems.length === 0) {
    return (
      <ZoneUserLayout>
        <ZoneUserNavbar showBackButton={true} title="Cart" />

        <div className="max-w-md mx-auto p-4 flex flex-col items-center justify-center h-96">
          <div className="text-center">
            <FaShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-fredoka text-primary-bg mb-2">Your cart is empty</h2>
            <p className="text-placeholder-subtext font-raleway mb-6">Add some delicious items to get started!</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goBackToMenu}
              className="bg-accent text-white px-6 py-3 rounded-full font-raleway font-bold hover:bg-hover-shade transition-colors duration-300 shadow-lg"
            >
              Browse Menu
            </motion.button>
          </div>
        </div>
      </ZoneUserLayout>
    );
  }

  return (
    <ZoneUserLayout>
      <ZoneUserNavbar showBackButton={true} title="Cart" />

      <div className="max-w-md mx-auto p-4">
        {/* Cart Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-fredoka text-primary-bg">Your Order</h1>
            <p className="text-sm text-placeholder-subtext font-raleway">
              {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} from {Object.keys(groupedCartItems).length} {Object.keys(groupedCartItems).length === 1 ? 'restaurant' : 'restaurants'}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowClearConfirm(true)}
            className="text-red-500 hover:text-red-600 font-raleway text-sm"
          >
            Clear All
          </motion.button>
        </div>

        {/* Cart Items Grouped by Shop */}
        <div className="space-y-6 mb-6">
          {Object.entries(groupedCartItems).map(([shopId, shopData]) => (
            <motion.div
              key={shopId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              {/* Shop Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-divider-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FaStore className="text-accent mr-2" />
                    <h3 className="font-fredoka text-primary-bg">{shopData.shopName}</h3>
                  </div>
                  <p className="font-sans font-bold text-primary-bg">₹{shopData.total.toFixed(2)}</p>
                </div>
              </div>

              {/* Shop Items */}
              <div className="p-4 space-y-4">
                {shopData.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg shadow-sm"
                    />

                    <div className="flex-1">
                      <h4 className="font-raleway font-bold text-primary-bg">{item.name}</h4>
                      <p className="text-sm font-sans font-medium text-primary-bg">₹{item.price.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDecrementQuantity(item.id)}
                        className="w-8 h-8 rounded-full bg-gray-200 text-primary-bg flex items-center justify-center hover:bg-gray-300 transition-colors duration-300"
                      >
                        <FaMinus className="text-sm" />
                      </motion.button>

                      <span className="font-sans font-bold text-lg text-primary-bg w-8 text-center">
                        {item.quantity}
                      </span>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleIncrementQuantity(item.id)}
                        className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-hover-shade transition-colors duration-300"
                      >
                        <FaPlus className="text-sm" />
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors duration-300 ml-2"
                      >
                        <FaTrash className="text-sm" />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <h3 className="font-fredoka text-primary-bg mb-3">Order Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-placeholder-subtext">Subtotal</span>
              <span className="font-sans font-medium">₹{cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-placeholder-subtext">Service Fee</span>
              <span className="font-sans font-medium">₹{(cartTotal * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-placeholder-subtext">GST (18%)</span>
              <span className="font-sans font-medium">₹{(cartTotal * 0.18).toFixed(2)}</span>
            </div>
            <div className="border-t border-divider-border pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-fredoka text-primary-bg">Total</span>
                <span className="font-sans font-bold text-lg text-primary-bg">
                  ₹{(cartTotal * 1.23).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={goToCheckout}
          className="w-full bg-accent text-white py-4 rounded-xl font-raleway font-bold text-lg hover:bg-hover-shade transition-colors duration-300 shadow-lg"
        >
          Proceed to Checkout
        </motion.button>
      </div>

      {/* Clear Cart Confirmation */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-fredoka text-primary-bg mb-2">Clear Cart?</h3>
              <p className="text-placeholder-subtext font-raleway mb-6">
                This will remove all items from your cart. This action cannot be undone.
              </p>

              <div className="flex space-x-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 bg-gray-200 text-primary-bg py-3 rounded-lg font-raleway font-medium hover:bg-gray-300 transition-colors duration-300"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearCart}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-raleway font-medium hover:bg-red-600 transition-colors duration-300"
                >
                  Clear All
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ZoneUserLayout>
  );
};

export default ZoneCartScreen;
