import React, { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaMoneyBillWave, FaCreditCard, FaWallet, FaShoppingBag, FaCreditCard as FaPayment, FaCheckCircle, FaClock } from 'react-icons/fa';
import { MdDeliveryDining, MdAccessTime, MdCall, MdTimer } from 'react-icons/md';
import { CartContext } from '../../context/CartContext.jsx';
import UserNavbar from './userNavbar';
import { useDispatch } from 'react-redux';
import { createOrder } from '../../store/slices/ordersSlice.js';
import { generateContextualUrl } from '../../utils/urlUtils';

const CheckoutScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Debug logging to help troubleshoot route parameters (only log once per mount)
  React.useEffect(() => {
    console.log('CheckoutScreen mounted with params:', { restaurantId, tableId, userId, zoneId });
  }, []); // Empty dependency array to log only once on mount
  const { cartItems } = useContext(CartContext);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsOTPVerification, setNeedsOTPVerification] = useState(false);
  const [isOTPVerified, setIsOTPVerified] = useState(false);

  // Calculate order totals
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const taxes = subtotal * 0.1; // Example 10% tax
  const total = subtotal + taxes;

  // Check if user needs OTP verification
  const checkOTPVerificationStatus = () => {
    const customerKey = `customer_${restaurantId || zoneId}_${userId}`;
    const customerData = localStorage.getItem(customerKey);
    
    console.log('CheckoutScreen - Checking OTP verification:');
    console.log('Customer key:', customerKey);
    console.log('Customer data from localStorage:', customerData);
    
    if (customerData) {
      try {
        const parsedData = JSON.parse(customerData);
        console.log('Parsed customer data:', parsedData);
        console.log('Verification status:', parsedData.verified);
        
        const isVerified = parsedData.verified === true;
        setIsOTPVerified(isVerified);
        setNeedsOTPVerification(!isVerified);
        
        console.log('Set isOTPVerified to:', isVerified);
        console.log('Set needsOTPVerification to:', !isVerified);
      } catch (error) {
        console.error('Error parsing customer data:', error);
        setNeedsOTPVerification(true);
        setIsOTPVerified(false);
        console.log('Error parsing - set needsOTPVerification to true, isOTPVerified to false');
      }
    } else {
      console.log('No customer data found - user needs OTP verification');
      setNeedsOTPVerification(true);
      setIsOTPVerified(false);
      console.log('Set needsOTPVerification to true, isOTPVerified to false');
    }
  };

  useEffect(() => {
    checkOTPVerificationStatus();
  }, [restaurantId, zoneId, userId]);

  // Add listener to refresh verification status when user returns from OTP screen
  useEffect(() => {
    const handleFocus = () => {
      console.log('Checkout screen gained focus - refreshing OTP status');
      checkOTPVerificationStatus();
    };

    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('customer_')) {
        console.log('Customer data changed in localStorage - refreshing OTP status');
        checkOTPVerificationStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [restaurantId, zoneId, userId]);

  // Set estimated delivery time (15-25 minutes from now)
  useEffect(() => {
    const now = new Date();
    const minDeliveryTime = new Date(now.getTime() + 15 * 60000);
    const maxDeliveryTime = new Date(now.getTime() + 25 * 60000);

    const formatTime = (date) => {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    setEstimatedDeliveryTime({
      min: formatTime(minDeliveryTime),
      max: formatTime(maxDeliveryTime)
    });
  }, []);

  const handleProceedToPayment = () => {
    setError('');
    console.log('HandleProceedToPayment - Current state:');
    console.log('cartItems.length:', cartItems.length);
    console.log('needsOTPVerification:', needsOTPVerification);
    console.log('isOTPVerified:', isOTPVerified);
    
    if (cartItems.length === 0) {
      setError('Your cart is empty. Please add items before proceeding.');
      return;
    }
    
    // Check if OTP verification is needed
    if (needsOTPVerification && !isOTPVerified) {
      console.log('User needs OTP verification - redirecting...');
      // Navigate to OTP verification
      const otpRoute = generateContextualUrl(
        { restaurantId, tableId, userId, zoneId },
        'otp-login'
      );
      console.log('Redirecting to OTP verification:', otpRoute);
      navigate(otpRoute);
      return;
    }
    
    console.log('User is verified - showing payment modal');
    // If already verified, proceed to payment
    setShowPaymentModal(true);
  };

  const handlePaymentSelection = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleConfirmOrder = async () => {
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setIsProcessingPayment(true);
    setError('');

    const orderData = {
      orderId: `TS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      restaurantId: restaurantId || 'default-restaurant',
      restaurantName: 'TableServe Restaurant',
      userId,
      zoneId,
      tableId,
      items: cartItems,
      subtotal,
      taxes,
      total,
      paymentMethod: selectedPaymentMethod,
      status: 'preparing', // Use status that matches the tracking screen
      tableNumber: tableId || 'N/A',
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 30 * 60000).toISOString(), // 30 minutes from now
      estimatedTime: 25, // 25 minutes estimated preparation time
      customerPhone: localStorage.getItem(`customer_${restaurantId || zoneId}_${userId}`) ?
        JSON.parse(localStorage.getItem(`customer_${restaurantId || zoneId}_${userId}`)).phoneNumber : null
    };

    console.log('Order Data being sent:', orderData);

    try {
      const result = await dispatch(createOrder(orderData)).unwrap();
      setIsProcessingPayment(false);
      setShowPaymentModal(false);
      setError('');
      
      console.log('Order creation result:', result);
      
      // Store the order ID for tracking purposes
      // This enables the OrderTrackingScreen to retrieve the real order data
      const orderIdToStore = result.order?.orderId || result.zoneOrder?.orderId || result.orderId || orderData.orderId;
      const recentOrderKey = `recent_order_${restaurantId || zoneId}_${tableId}_${userId}`;
      localStorage.setItem(recentOrderKey, orderIdToStore);
      
      console.log('Order created successfully:', {
        orderId: orderIdToStore,
        result,
        storageKey: recentOrderKey,
        orderType: restaurantId ? 'restaurant' : 'zone',
        originalOrderData: orderData
      });
      
      // Verify the order was stored correctly
      const orderStorageKey = restaurantId ? `restaurant_orders_${restaurantId}` : `zone_orders_${zoneId}`;
      const storedOrders = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
      const storedOrder = storedOrders.find(o => o.orderId === orderIdToStore);
      
      console.log('Order storage verification:', {
        storageKey: orderStorageKey,
        totalOrdersInStorage: storedOrders.length,
        foundStoredOrder: !!storedOrder,
        storedOrder: storedOrder ? {
          orderId: storedOrder.orderId,
          status: storedOrder.status,
          tableId: storedOrder.tableId,
          userId: storedOrder.userId,
          itemCount: storedOrder.items?.length,
          total: storedOrder.total || storedOrder.grandTotal
        } : null
      });
      
      // Navigate to success screen with proper route parameters
      let successRoute;
      if (zoneId && tableId && userId) {
        successRoute = `/tableserve/zone/${zoneId}/table/${tableId}/user/${userId}/success`;
      } else if (zoneId && tableId) {
        successRoute = `/tableserve/zone/${zoneId}/table/${tableId}/success`;
      } else if (restaurantId && tableId && userId) {
        successRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/user/${userId}/success`;
      } else if (restaurantId && tableId) {
        successRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/success`;
      } else {
        successRoute = '/';
      }
      console.log('Navigating to success screen:', successRoute);
      navigate(successRoute);
    } catch (error) {
      setIsProcessingPayment(false);
      console.error('Failed to create order:', error);
      setError(`Failed to create order: ${error.message || error}`);
      // Don't close the modal on error, let user retry
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 text-gray-900 relative pb-safe">
      {/* Mobile-First Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-6 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-accent to-red-500 rounded-full shadow-lg flex items-center justify-center touch-manipulation"
            >
              <FaArrowLeft className="text-white text-sm sm:text-base" />
            </motion.button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-fredoka">Checkout</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-raleway">
                Table {tableId} • {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          
          {cartItems.length > 0 && (
            <div className="text-right">
              <p className="text-lg sm:text-xl font-bold text-accent font-fredoka">₹{total.toFixed(2)}</p>
              <p className="text-xs sm:text-sm text-gray-500 font-raleway">Total</p>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Checkout Content */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl sm:rounded-2xl flex items-center space-x-3"
          >
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex-shrink-0"></div>
            <span className="font-medium font-raleway text-sm sm:text-base">{error}</span>
          </motion.div>
        )}

        {/* Checkout Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 p-4 sm:p-6 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-accent/5 to-transparent rounded-full -translate-y-4 translate-x-4"></div>
            
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 font-fredoka mb-4 text-center relative z-10">Order Progress</h3>
            <div className="flex justify-between items-center relative z-10">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-accent to-red-500 flex items-center justify-center mb-2 shadow-lg">
                  <FaShoppingBag className="text-white text-sm sm:text-base" />
                </div>
                <span className="text-xs sm:text-sm text-accent font-medium font-raleway">Cart</span>
              </div>
              <div className="flex-1 h-2 bg-gradient-to-r from-gray-200 to-gray-300 mx-3 sm:mx-4 rounded-full relative">
                <div className="h-full bg-gradient-to-r from-accent to-red-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-accent to-red-500 flex items-center justify-center mb-2 shadow-lg">
                  <FaPayment className="text-white text-sm sm:text-base" />
                </div>
                <span className="text-xs sm:text-sm text-accent font-medium font-raleway">Payment</span>
              </div>
              <div className="flex-1 h-2 bg-gradient-to-r from-gray-200 to-gray-300 mx-3 sm:mx-4 rounded-full">
                <div className="h-full bg-gray-300 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-300 flex items-center justify-center mb-2 shadow-lg">
                  <FaCheckCircle className="text-white text-sm sm:text-base" />
                </div>
                <span className="text-xs sm:text-sm text-gray-500 font-medium font-raleway">Complete</span>
              </div>
            </div>
          </div>
        </motion.div>

        {cartItems.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 sm:py-20"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 sm:mb-8 shadow-lg">
              <FaShoppingBag className="text-4xl sm:text-5xl text-gray-400" />
            </div>
            <div className="text-center max-w-sm">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-600 mb-3 sm:mb-4 font-fredoka">Your Cart is Empty</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 font-raleway leading-relaxed">
                Add some delicious items to your cart before proceeding to checkout.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/5 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-6 -translate-x-6"></div>
            
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 font-fredoka mb-6 sm:mb-8 text-center">Order Summary</h2>

              {/* Cart Items */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="space-y-4">
                  {cartItems.map((item, index) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center py-3 sm:py-4 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="relative">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl sm:rounded-2xl shadow-md mr-4 sm:mr-6" 
                          onError={(e) => {
                            e.target.src = '/placeholder-food.jpg';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 font-fredoka mb-1 line-clamp-2">{item.name}</h3>
                        <p className="text-sm sm:text-base text-gray-600 font-raleway mb-1">₹{item.price.toFixed(2)} × {item.quantity}</p>
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 font-raleway">items</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-accent font-fredoka">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Order Totals */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-raleway text-base sm:text-lg">Subtotal</span>
                    <span className="font-bold text-lg sm:text-xl text-gray-800 font-fredoka">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-raleway text-base sm:text-lg">Taxes (10%)</span>
                    <span className="font-bold text-lg sm:text-xl text-gray-800 font-fredoka">₹{taxes.toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xl sm:text-2xl font-bold text-gray-800 font-fredoka">Total</span>
                      <span className="text-2xl sm:text-3xl font-bold text-accent font-fredoka">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 font-fredoka mb-4 sm:mb-6 text-center">Delivery Details</h3>
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-accent/20 to-red-500/20 flex items-center justify-center mr-4 sm:mr-6">
                      <MdDeliveryDining className="text-accent text-xl sm:text-2xl" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base sm:text-lg font-bold text-gray-800 font-fredoka">Table {tableId || 'N/A'}</p>
                      <p className="text-sm sm:text-base text-gray-600 font-raleway">
                        {zoneId ? 'Your order will be served at your table in the zone' : 'Your order will be served at your table'}
                      </p>
                    </div>
                  </div>

                  {estimatedDeliveryTime && (
                    <div className="flex items-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center mr-4 sm:mr-6">
                        <MdTimer className="text-green-600 text-xl sm:text-2xl" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base sm:text-lg font-bold text-gray-800 font-fredoka">Estimated Preparation Time</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm sm:text-base font-bold text-green-600 font-raleway bg-green-50 px-3 py-1 rounded-full border border-green-200">
                            10-20 minutes
                          </p>
                          <span className="text-xs sm:text-sm text-gray-500 font-raleway">• Fresh preparation</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Service Info */}
                  <div className="flex items-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center mr-4 sm:mr-6">
                      <MdCall className="text-blue-600 text-xl sm:text-2xl" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base sm:text-lg font-bold text-gray-800 font-fredoka">
                        {zoneId ? `Zone Service` : `Table Service`}
                      </p>
                      <p className="text-sm sm:text-base text-gray-600 font-raleway">
                        {zoneId ? 'Orders from multiple restaurants in this zone' : 'Direct service from restaurant kitchen'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {cartItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="sticky bottom-4 sm:bottom-6 z-20"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleProceedToPayment}
              className="w-full bg-gradient-to-r from-accent to-red-500 text-white py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-bold font-fredoka text-lg sm:text-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3 touch-manipulation"
            >
              <FaPayment className="text-lg sm:text-xl" />
              <span>Proceed to Payment • ₹{total.toFixed(2)}</span>
              {needsOTPVerification && !isOTPVerified && (
                <span className="text-xs opacity-80 block mt-1">• Number verification required</span>
              )}
            </motion.button>
          </motion.div>
        )}
        
        {/* Bottom Spacing for Sticky Button */}
        {cartItems.length > 0 && (
          <div className="h-20 sm:h-24"></div>
        )}

        <AnimatePresence>
          {showPaymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ y: 300, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 300, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white/95 backdrop-blur-sm rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-gray-100 relative overflow-hidden"
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/5 to-transparent rounded-full -translate-y-6 translate-x-6"></div>
                
                {isProcessingPayment ? (
                  <div className="py-8 sm:py-12 flex flex-col items-center relative z-10">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-accent border-t-transparent rounded-full animate-spin mb-6 sm:mb-8"></div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 font-fredoka mb-3 sm:mb-4 text-center">Processing Payment</h2>
                    <p className="text-gray-600 text-center font-raleway text-sm sm:text-base">Please wait while we process your payment securely...</p>
                  </div>
                ) : (
                  <div className="relative z-10">
                    <div className="text-center mb-6 sm:mb-8">
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 font-fredoka mb-2 sm:mb-3">Select Payment</h2>
                      <p className="text-gray-600 font-raleway text-sm sm:text-base">Choose your preferred payment method</p>
                    </div>

                    {/* Error Message in Modal */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-3"
                      >
                        <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                        <span className="font-medium font-raleway text-sm">{error}</span>
                      </motion.div>
                    )}

                    <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePaymentSelection('UPI')}
                        className={`w-full flex items-center p-4 sm:p-5 rounded-2xl text-gray-800 font-bold transition-all duration-300 border-2 shadow-md touch-manipulation ${
                          selectedPaymentMethod === 'UPI'
                            ? 'bg-gradient-to-r from-accent/10 to-blue-50 border-accent'
                            : 'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200 hover:border-accent'
                        }`}
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-accent/20 to-blue-500/20 flex items-center justify-center mr-4 sm:mr-5">
                          <FaCreditCard className="text-accent text-xl sm:text-2xl" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="text-lg sm:text-xl font-fredoka">UPI Payment</div>
                          <div className="text-sm sm:text-base font-raleway text-gray-600">Pay using UPI apps like GPay, PhonePe</div>
                        </div>
                        {selectedPaymentMethod === 'UPI' && (
                          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                            <FaCheckCircle className="text-white text-sm" />
                          </div>
                        )}
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePaymentSelection('COD')}
                        className={`w-full flex items-center p-4 sm:p-5 rounded-2xl text-gray-800 font-bold transition-all duration-300 border-2 shadow-md touch-manipulation ${
                          selectedPaymentMethod === 'COD'
                            ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-500'
                            : 'bg-gradient-to-r from-green-50 to-blue-50 border-gray-200 hover:border-accent'
                        }`}
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-green-500/20 to-accent/20 flex items-center justify-center mr-4 sm:mr-5">
                          <FaMoneyBillWave className="text-accent text-xl sm:text-2xl" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="text-lg sm:text-xl font-fredoka">Cash on Delivery</div>
                          <div className="text-sm sm:text-base font-raleway text-gray-600">Pay when your order arrives</div>
                        </div>
                        {selectedPaymentMethod === 'COD' && (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <FaCheckCircle className="text-white text-sm" />
                          </div>
                        )}
                      </motion.button>
                    </div>

                    <div className="flex space-x-3 sm:space-x-4">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowPaymentModal(false);
                          setSelectedPaymentMethod(null);
                          setError('');
                        }}
                        className="flex-1 py-3 sm:py-4 rounded-2xl font-bold font-fredoka text-gray-700 border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 text-base sm:text-lg touch-manipulation"
                      >
                        Cancel
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConfirmOrder}
                        disabled={!selectedPaymentMethod}
                        className={`flex-1 py-3 sm:py-4 rounded-2xl font-bold font-fredoka shadow-lg transition-all duration-300 text-base sm:text-lg touch-manipulation ${
                          selectedPaymentMethod
                            ? 'bg-gradient-to-r from-accent to-red-500 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Confirm Order
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CheckoutScreen;
