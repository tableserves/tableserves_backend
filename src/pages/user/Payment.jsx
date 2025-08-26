import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { FaCreditCard, FaPaypal, FaApplePay } from 'react-icons/fa';

const Payment = () => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const { items, total } = useSelector((state) => state.cart);

  const handlePayment = () => {
    // Payment processing logic will be implemented here
    alert('Payment processing will be implemented with a payment gateway');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-fredoka text-white mb-2">Payment</h1>
        <p className="text-white/80 font-raleway">Complete your order</p>
      </div>

      {/* Order Summary */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-raleway text-white mb-4">Order Summary</h3>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-white/80">
              <span>{item.name} x {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/20 pt-4">
          <div className="flex justify-between text-white font-semibold text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-raleway text-white mb-4">Payment Method</h3>
        <div className="space-y-3">
          <label className="flex items-center p-3 bg-white/5 rounded-lg cursor-pointer">
            <input
              type="radio"
              name="payment"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <FaCreditCard className="mr-3 text-accent" />
            <span className="text-white font-raleway">Credit/Debit Card</span>
          </label>
          <label className="flex items-center p-3 bg-white/5 rounded-lg cursor-pointer">
            <input
              type="radio"
              name="payment"
              value="paypal"
              checked={paymentMethod === 'paypal'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <FaPaypal className="mr-3 text-accent" />
            <span className="text-white font-raleway">PayPal</span>
          </label>
          <label className="flex items-center p-3 bg-white/5 rounded-lg cursor-pointer">
            <input
              type="radio"
              name="payment"
              value="apple"
              checked={paymentMethod === 'apple'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mr-3"
            />
            <FaApplePay className="mr-3 text-accent" />
            <span className="text-white font-raleway">Apple Pay</span>
          </label>
        </div>
      </div>

      {/* Payment Form */}
      {paymentMethod === 'card' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-raleway text-white mb-4">Card Details</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Card Number"
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="MM/YY"
                className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
              />
              <input
                type="text"
                placeholder="CVV"
                className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
              />
            </div>
            <input
              type="text"
              placeholder="Cardholder Name"
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60"
            />
          </div>
        </div>
      )}

      {/* Pay Button */}
      <motion.button
        onClick={handlePayment}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-4 rounded-lg transition-colors"
      >
        Pay ${total.toFixed(2)}
      </motion.button>
    </motion.div>
  );
};

export default Payment;
