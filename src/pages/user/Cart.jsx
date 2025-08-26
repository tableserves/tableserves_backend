import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { updateQuantity, removeItem } from '../../store/slices/cartSlice';
import { FaPlus, FaMinus, FaTrash, FaArrowLeft } from 'react-icons/fa';

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { restaurantName, tableId } = useParams();
  const { items, total } = useSelector((state) => state.cart);

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      dispatch(removeItem(itemId));
    } else {
      dispatch(updateQuantity({ itemId, quantity: newQuantity }));
    }
  };

  const handleRemoveItem = (itemId) => {
    dispatch(removeItem(itemId));
  };

  const proceedToPayment = () => {
    navigate(`/${restaurantName}/${tableId}/payment`);
  };

  const goBackToMenu = () => {
    navigate(`/${restaurantName}/${tableId}/menu`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaTrash className="w-10 h-10 text-white/60" />
          </div>
          <h2 className="text-2xl font-fredoka text-white mb-4">Your cart is empty</h2>
          <p className="text-white/70 font-raleway mb-8">
            Add some delicious items from our menu to get started!
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goBackToMenu}
            className="bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-3 px-8 rounded-lg flex items-center space-x-2 mx-auto"
          >
            <FaArrowLeft className="w-4 h-4" />
            <span>Browse Menu</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={goBackToMenu}
            className="text-white hover:text-accent transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-fredoka text-white">Your Cart</h1>
            <p className="text-white/70 font-raleway">Table {tableId}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/70 font-raleway text-sm">Total Items</p>
          <p className="text-2xl font-fredoka text-accent">
            {items.reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-center space-x-4">
                {/* Item Image */}
                <div className="w-20 h-20 bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={item.image || '/api/placeholder/80/80'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Item Details */}
                <div className="flex-1">
                  <h3 className="text-lg font-fredoka text-white mb-1">{item.name}</h3>
                  <p className="text-white/60 font-raleway text-sm mb-2">
                    {item.description}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-accent font-fredoka text-lg">
                      ${item.price.toFixed(2)}
                    </span>
                    {item.isVeg && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-raleway">
                        VEG
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-white hover:text-accent transition-colors"
                    >
                      <FaMinus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-white font-raleway font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-white hover:text-accent transition-colors"
                    >
                      <FaPlus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Item Total */}
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-white/70 font-raleway">
                  {item.quantity} × ${item.price.toFixed(2)}
                </span>
                <span className="text-xl font-fredoka text-white">
                  ${(item.quantity * item.price).toFixed(2)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10 sticky top-24">
            <h2 className="text-xl font-fredoka text-white mb-6">Order Summary</h2>

            {/* Order Details */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-white/70 font-raleway">Subtotal</span>
                <span className="text-white font-raleway">${total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white/70 font-raleway">Service Charge (10%)</span>
                <span className="text-white font-raleway">${(total * 0.1).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white/70 font-raleway">Tax (8%)</span>
                <span className="text-white font-raleway">${(total * 0.08).toFixed(2)}</span>
              </div>

              <div className="border-t border-white/20 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-fredoka text-white">Total</span>
                  <span className="text-2xl font-fredoka text-accent">
                    ${(total * 1.18).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="mb-6">
              <label className="block text-white font-raleway mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                placeholder="Any special requests for your order..."
                rows="3"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-accent resize-none font-raleway"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={proceedToPayment}
                className="w-full bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-4 rounded-lg transition-colors"
              >
                Proceed to Payment
              </motion.button>

              <button
                onClick={goBackToMenu}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-raleway font-semibold py-3 rounded-lg transition-colors border border-white/20"
              >
                Add More Items
              </button>
            </div>

            {/* Estimated Time */}
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-white/70 font-raleway text-sm">
                  Estimated Preparation Time
                </span>
                <span className="text-accent font-raleway font-semibold">
                  15-20 mins
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Cart;
