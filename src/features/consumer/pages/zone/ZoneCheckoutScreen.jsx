import React, { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaShoppingBag } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { CartContext } from '../../context/CartContext.jsx';
import { useCreateOrderMutation } from '../../../../store/api/ordersApi.js';
import OrderTrackingService from '../../../../services/OrderTrackingService.js';
import logo from '../../../../assets/logo.svg';

const ZoneCheckoutScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();
  const { cartItems } = useContext(CartContext);
  
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();

  // Consolidated Form State
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });
  
  // UI & Flow State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [error, setError] = useState('');
  
  // Data State
  const [restaurantData, setRestaurantData] = useState(null);

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const total = subtotal;

  // Fetch restaurant data for display
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!restaurantId) return;
      try {
        const response = await fetch(`/api/v1/restaurants/public/id/${restaurantId}`, {
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          const result = await response.json();
          setRestaurantData(result.data);
        }
      } catch (err) {
        console.error('Error fetching restaurant data:', err);
      }
    };
    fetchRestaurantData();
  }, [restaurantId]);

  useEffect(() => {
    const customerKey = `customer_${restaurantId || zoneId}_${userId}`;
    const customerData = localStorage.getItem(customerKey);

    if (customerData) {
      try {
        const parsedData = JSON.parse(customerData);
        setCustomerForm(prev => ({
          name: parsedData.customerName || prev.name,
          phone: parsedData.phoneNumber || prev.phone
        }));
      } catch (err) {
        console.error('Error parsing customer data:', err);
      }
    }
  }, [restaurantId, zoneId, userId]);

  const handleProceedToConfirm = () => {
    setError('');
    if (cartItems.length === 0) {
      setError('Your cart is empty. Please add items before proceeding.');
      return;
    }
    // Just open the modal. Validation happens inside the modal before final confirmation.
    setShowConfirmModal(true);
  };

  const extractOrderInfo = (result, type) => {
    let orderNumber, orderId;
    if (type === 'RESTAURANT') {
      orderNumber = result.orderNumber || result.data?.orderNumber || result.data?.order?.orderNumber || result.order?.orderNumber || result._id;
      orderId = result._id || result.id || result.orderId || result.data?._id || result.data?.order?._id || orderNumber;
    } else {
      orderNumber = result.order?.orderNumber || result.data?.order?.orderNumber || result.data?.orderNumber || result.orderNumber;
      orderId = result.order?._id || result.data?.order?._id || result.data?._id || result._id;
    }
    return { orderNumber, orderId };
  };

  const handleConfirmOrder = async () => {
    if (!customerForm.phone.trim() || customerForm.phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!customerForm.name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsProcessingOrder(true);
    setError('');
    OrderTrackingService.clearOrderInfo();

    const orderData = {
      tableNumber: tableId,
      customer: {
        name: customerForm.name.trim(),
        phone: customerForm.phone
      },
      items: cartItems.map(item => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        modifiers: item.modifiers || [],
        variants: item.variants || [],
        specialInstructions: item.specialInstructions || '',
        shopId: item.shopId
      })),
      specialInstructions: '',
      paymentMethod: 'cash' // Always COD
    };
    
    if (restaurantId) orderData.restaurantId = restaurantId;
    if (zoneId) orderData.zoneId = zoneId;

    try {
      const result = await createOrder(orderData).unwrap();
      setIsProcessingOrder(false);
      setShowConfirmModal(false);

      const orderType = restaurantId ? 'RESTAURANT' : 'ZONE';
      const { orderNumber, orderId } = extractOrderInfo(result, orderType);

      const orderInfo = { 
        orderNumber, 
        orderId, 
        customerPhone: customerForm.phone, 
        restaurantId, 
        zoneId, 
        tableNumber: tableId 
      };
      
      if (orderInfo.orderNumber) {
        OrderTrackingService.storeOrderInfo(orderInfo);
      }

      const successRoute = zoneId 
        ? (userId ? `/zone/${zoneId}/table/${tableId}/user/${userId}/success` : `/zone/${zoneId}/table/${tableId}/success`)
        : (userId ? `/restaurant/${restaurantId}/table/${tableId}/user/${userId}/success` : `/restaurant/${restaurantId}/table/${tableId}/success`);
      
      navigate(successRoute);
    } catch (err) {
      setIsProcessingOrder(false);
      const msg = `Failed to create order: ${err?.data?.message || err?.message || err}`;
      setError(msg);
      // Also surface a toast — the inline banner can scroll off the viewport on
      // smaller phones when the customer is at the bottom of the cart.
      toast.error(msg);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm(prev => ({ ...prev, [name]: name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative pb-safe font-sans selection:bg-accent/20">
      
      {/* Premium Frosted Glass Header (Accent Theme) */}
      <div className="sticky top-0 bg-accent shadow-[0_4px_20px_-5px_rgba(0,0,0,0.15)] border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between min-h-[50px]">
          <div className="flex items-center gap-3 overflow-hidden pr-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/15 border border-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors backdrop-blur-md shadow-sm flex-shrink-0"
            >
              <FaArrowLeft className="text-[15px]" />
            </motion.button>
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-[1.3rem] sm:text-[1.5rem] font-extrabold text-white tracking-tight leading-none drop-shadow-sm truncate">
                Checkout
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-white/85 uppercase tracking-widest mt-1.5 flex items-center gap-1.5 truncate">
                <span className="truncate">{zoneId ? 'Food Zone' : restaurantData?.name || 'Restaurant'}</span>
                <span className="w-1 h-1 rounded-full bg-white/40 flex-shrink-0" />
                <span className="flex-shrink-0">Table {tableId}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto px-4 sm:px-5 py-6">
        
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 p-3.5 bg-white border border-red-200 text-red-600 rounded-2xl flex items-center gap-3 shadow-sm"
            >
              <div className="w-5 h-5 bg-red-500 rounded-full flex-shrink-0 flex items-center justify-center">
                <span className="text-white text-[10px] font-black">!</span>
              </div>
              <span className="font-bold text-sm">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 pb-10 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm"
            >
              <FaShoppingBag className="text-4xl text-slate-300" />
            </motion.div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Your Cart is Empty</h2>
            <p className="text-slate-500 font-medium mb-8 max-w-[250px] leading-relaxed">
              Add some delicious items to your cart before proceeding to checkout.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* Delivery Details Card */}
            <div className="bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 relative overflow-hidden mb-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <img src={logo} alt="Tableserves Logo" className="w-12 h-12 object-contain opacity-90" />
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Serving at</p>
                  <p className="text-lg font-black text-accent tracking-tight">Table {tableId || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[1.5rem] border border-slate-100 overflow-hidden mb-6">
              <div className="bg-white px-5 py-3.5 border-b border-slate-100">
                <h2 className="font-black text-slate-800 text-[1.05rem] tracking-tight uppercase">Order Summary</h2>
              </div>
              <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-white border-b border-slate-50">
                <div className="col-span-6"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</span></div>
                <div className="col-span-3 text-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</span></div>
                <div className="col-span-3 text-right"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</span></div>
              </div>
              <div className="flex flex-col bg-white">
                {cartItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`grid grid-cols-12 gap-2 px-5 py-4 items-center ${index !== cartItems.length - 1 ? 'border-b border-dashed border-slate-100' : ''}`}
                  >
                    <div className="col-span-6 min-w-0">
                      <h3 className="font-bold text-slate-800 text-[0.95rem] leading-tight truncate">{item.name}</h3>
                    </div>
                    <div className="col-span-3 text-center">
                      <span className="inline-flex items-center justify-center text-slate-700 font-black text-[1.0rem] w-8 h-8 rounded-lg ">{item.quantity}</span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="font-black text-slate-900 text-[1.0rem]">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="bg-white border-t border-slate-100 px-5 py-4">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-slate-500 text-[1.0rem] font-semibold text-sm">Subtotal</span>
                  <span className="font-bold text-slate-700">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-slate-100 pt-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900 text-[1.2rem]">Total</span>
                    <span className="font-black text-accent text-[1.2rem]">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-28" />
          </motion.div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 bg-transparent p-4 pb-safe z-30 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleProceedToConfirm}
              // Button is always enabled if cart has items to trigger the modal
              className="w-full flex items-center justify-between bg-gradient-to-r from-accent to-accent/90 text-white p-4 px-5 rounded-[1.25rem] shadow-[0_8px_24px_-6px_var(--tw-shadow-color)] shadow-accent/30 hover:shadow-accent/50 transition-all"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Total Amount</span>
                <span className="font-black text-[1.3rem] leading-none mt-0.5">₹{total.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2.5 font-bold text-[1.05rem] tracking-wide">
                Place Order
                <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm"><FaArrowRight className="text-[12px]" /></div>
              </div>
            </motion.button>
          </div>
        </div>
      )}

      {/* Confirmation & Details Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) setShowConfirmModal(false);
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              {/* Decorative Accent Ring */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
              
              {/* Drag Indicator Handle */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing" />

              {isProcessingOrder ? (
                <div className="py-10 flex flex-col items-center relative z-10">
                  <div className="w-16 h-16 border-4 border-slate-100 rounded-full animate-spin border-t-accent mb-6" />
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Placing Your Order</h2>
                  <p className="text-sm text-slate-500">Please wait a moment...</p>
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2 tracking-tight">Confirm Order</h2>
                    <p className="text-slate-500 text-sm font-medium">Please enter your details to continue</p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-4 border border-slate-100">
                    
                    {/* User Details Form Inside Modal */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={customerForm.name}
                        onChange={handleFormChange}
                        placeholder="Enter your name"
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none text-sm font-bold placeholder-slate-400 text-slate-800 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={customerForm.phone}
                        onChange={handleFormChange}
                        placeholder="Enter 10-digit mobile number"
                        maxLength="10"
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none text-sm font-bold placeholder-slate-400 text-slate-800 shadow-sm"
                      />

                    </div>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowConfirmModal(false)}
                      className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleConfirmOrder}
                      // Disable logic relies on the user typing valid information 
                      disabled={!customerForm.name.trim() || customerForm.phone.length !== 10}
                      className="flex-1 bg-accent text-white py-3.5 rounded-xl font-bold text-sm hover:shadow-accent/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
  );
};

export default ZoneCheckoutScreen;