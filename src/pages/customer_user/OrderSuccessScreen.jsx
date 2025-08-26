import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaDownload } from 'react-icons/fa';
import { clearCart } from '../../store/slices/cartSlice';
import Receipt from '../../components/common/Receipt';
import { downloadPdf } from '../../utils/downloadUtils';

const OrderSuccessScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Debug logging to help troubleshoot route parameters (only log once per mount)
  React.useEffect(() => {
    console.log('OrderSuccessScreen mounted with params:', { restaurantId, tableId, userId, zoneId });
  }, []); // Empty dependency array to log only once on mount
  const receiptRef = useRef();

  const orderState = useSelector((state) => state.order);
  const currentOrder = orderState?.currentOrder || null;

  // Clear the cart once the order is successful
  useEffect(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const handleTrackOrder = () => {
    let trackingRoute;
    if (zoneId && tableId && userId) {
      trackingRoute = `/tableserve/zone/${zoneId}/table/${tableId}/user/${userId}/tracking`;
    } else if (zoneId && tableId) {
      trackingRoute = `/tableserve/zone/${zoneId}/table/${tableId}/tracking`;
    } else if (restaurantId && tableId && userId) {
      trackingRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/user/${userId}/tracking`;
    } else if (restaurantId && tableId) {
      trackingRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/tracking`;
    } else {
      trackingRoute = '/';
    }
    console.log('Navigating to tracking:', trackingRoute);
    navigate(trackingRoute);
  };

  const handleDownloadReceipt = () => {
    // Create a default order object if currentOrder is null
    const orderForReceipt = currentOrder || {
      orderId: `TS${Date.now()}`,
      restaurantName: 'TableServe Restaurant',
      items: [],
      subtotal: 0,
      taxes: 0,
      total: 0,
      tableNumber: tableId || 'N/A',
      createdAt: new Date().toISOString(),
      paymentMethod: 'Digital Payment'
    };

    // Use a short timeout to ensure the component is rendered
    setTimeout(() => {
      downloadPdf(receiptRef.current, `TableServe_Receipt_${orderForReceipt.orderId || 'Order'}.pdf`);
    }, 100);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 text-gray-900 relative pb-safe">
      {/* Hidden Receipt for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <Receipt
          ref={receiptRef}
          orderDetails={currentOrder || {
            orderId: `TS${Date.now()}`,
            restaurantName: 'TableServe Restaurant',
            items: [],
            subtotal: 0,
            taxes: 0,
            total: 0,
            tableNumber: tableId || 'N/A',
            createdAt: new Date().toISOString(),
            paymentMethod: 'Digital Payment'
          }}
        />
      </div>

      {/* Mobile-First Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <FaCheckCircle className="text-3xl sm:text-4xl text-green-500" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl sm:text-3xl font-bold text-white font-fredoka mb-2"
          >
            Order Placed Successfully!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-green-100 text-sm sm:text-base font-raleway"
          >
            Thank you for your order • Table {tableId}
          </motion.p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Order Status Card */}
        {currentOrder && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/5 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-accent/5 to-transparent rounded-full translate-y-6 -translate-x-6"></div>
            
            <div className="text-center mb-4 relative z-10">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 font-fredoka mb-2">Order Details</h3>
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-3 sm:p-4">
                <p className="text-sm sm:text-base text-gray-600 font-raleway mb-1">
                  Order ID: <span className="font-bold text-accent">{currentOrder.orderId || `TS${Date.now()}`}</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 font-raleway">
                  Estimated delivery: 15-25 minutes
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="space-y-4 sm:space-y-5"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleTrackOrder}
            className="w-full bg-gradient-to-r from-accent to-red-500 text-white py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-bold font-fredoka text-lg sm:text-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3 touch-manipulation"
          >
            <span>Track Your Order</span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadReceipt}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-bold font-fredoka text-lg sm:text-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3 touch-manipulation"
          >
            <FaDownload className="text-lg sm:text-xl" />
            <span>Download Receipt</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderSuccessScreen;