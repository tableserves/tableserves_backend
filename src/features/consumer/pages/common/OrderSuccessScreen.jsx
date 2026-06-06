import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaDownload, FaTruck, FaUtensils, FaBell, FaHome } from 'react-icons/fa';
import { clearCart } from '../../../../store/slices/cartSlice';
import CustomerReceipt from '../../components/common/CustomerReceipt';
import OrderTrackingService from '../../../../services/OrderTrackingService';
import { downloadPdf } from '../../../../shared/utils/downloadUtils';
import { generateHomeNavigationUrl } from '../../../../shared/utils/orderTypeUtils';

const OrderSuccessScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const receiptRef = useRef();
  const [orderNumber, setOrderNumber] = useState(null);
  const [autoRedirectCount, setAutoRedirectCount] = useState(3);
  const [showAutoRedirect, setShowAutoRedirect] = useState(true);
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);

  const orderState = useSelector((state) => state.order);
  const currentOrder = orderState?.currentOrder || null;

  // Clear the cart once the order is successful
  useEffect(() => {
    dispatch(clearCart());

    // Extract order number from current order
    if (currentOrder) {
      setOrderNumber(currentOrder.orderNumber || currentOrder.orderId);
    }
  }, [dispatch, currentOrder]);

  // MOVE handleTrackOrder BEFORE the useEffect that uses it
  const handleTrackOrder = useCallback(() => {
    // Enhanced debugging for order tracking issues
    const orderType = restaurantId ? 'restaurant' : 'zone';
    console.log(`🚀 handleTrackOrder called for ${orderType} order`);
    console.log('Current URL params:', { restaurantId, tableId, userId, zoneId });

    // Always use order number-based tracking for both restaurant and zone orders
    const storedInfo = OrderTrackingService.getCurrentOrderInfo();
    
    // Debug localStorage contents
    console.log('📦 Current stored order info:', storedInfo);
    console.log('🔍 hasValidOrderInfo:', OrderTrackingService.hasValidOrderInfo());

    // Debug individual localStorage keys
    console.log('🗂️ Individual localStorage items:', {
      orderNumber: localStorage.getItem('currentOrderNumber'),
      customerPhone: localStorage.getItem('currentOrderPhone'),
      restaurantId: localStorage.getItem('currentRestaurantId'),
      zoneId: localStorage.getItem('currentZoneId'),
      tableNumber: localStorage.getItem('currentTableNumber')
    });

    // PRIORITY: If we have valid order info, use the appropriate tracking URL format
if (storedInfo.orderNumber && storedInfo.customerPhone) {
  // For zone orders, use the zone tracking URL
  if (zoneId && storedInfo.zoneId) {
    const trackingUrl = `/track/zone/${storedInfo.orderNumber}?phone=${encodeURIComponent(storedInfo.customerPhone)}`;
    console.log('✅ Navigating to zone order tracking:', trackingUrl);
    navigate(trackingUrl);
    return;
  }
  
  // For restaurant orders, use the standard tracking
  const trackingUrl = `/track/${storedInfo.orderNumber}?phone=${encodeURIComponent(storedInfo.customerPhone)}`;
  console.log('✅ Navigating to order tracking:', trackingUrl);
  navigate(trackingUrl);
  return;
}
    
    console.warn('⚠️ No valid order info in storage - trying to get from Redux state');
    
    // FALLBACK 1: Try to get order number from Redux state
    if (currentOrder && (currentOrder.orderNumber || currentOrder.orderId)) {
      const orderNum = currentOrder.orderNumber || currentOrder.orderId;
      const phone = currentOrder.customer?.phone || localStorage.getItem('currentOrderPhone') || localStorage.getItem('customerPhone');
      
      if (orderNum && phone) {
        // Store this info for future use
        const orderTrackingData = {
          orderNumber: orderNum,
          customerPhone: phone,
          restaurantId: restaurantId,
          zoneId: zoneId,
          tableNumber: tableId
        };
        OrderTrackingService.storeOrderInfo(orderTrackingData);
        
        // Choose appropriate tracking route based on context
        const trackingUrl = zoneId 
          ? `/track/zone/${orderNum}?phone=${encodeURIComponent(phone)}`
          : `/track/${orderNum}?phone=${encodeURIComponent(phone)}`;
        console.log('✅ Navigating to order tracking with Redux state order info:', trackingUrl);
        navigate(trackingUrl);
        return;
      }
    }
    
    console.warn('⚠️ Could not get order info from Redux - using legacy fallback');
    
    // FALLBACK 2: Use legacy tracking URLs (restaurant or zone specific)
    if (restaurantId && tableId) {
      console.log('🍽️ Using legacy restaurant tracking URL as last resort');
      const restaurantTrackingUrl = userId 
        ? `/track/restaurant/${restaurantId}?table=${tableId}&user=${userId}`
        : `/track/restaurant/${restaurantId}?table=${tableId}`;
      console.log('🔄 Navigating to restaurant tracking URL:', restaurantTrackingUrl);
      navigate(restaurantTrackingUrl);
      return;
    }
    
    if (zoneId && tableId) {
      console.log('🏙️ Using legacy zone tracking URL as last resort');
      const zoneTrackingUrl = userId
        ? `/track/zone/${zoneId}?table=${tableId}&user=${userId}`
        : `/track/zone/${zoneId}?table=${tableId}`;
      console.log('🔄 Navigating to zone tracking URL:', zoneTrackingUrl);
      navigate(zoneTrackingUrl);
      return;
    }
    
    // If we get here, we couldn't navigate anywhere
    console.error('💥 Cannot navigate - missing context for both restaurant and zone');
    alert('Unable to track order. Please contact restaurant support.');
  }, [navigate, restaurantId, tableId, userId, zoneId, currentOrder]);

  // Auto-redirect to order tracking after 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRedirectCount((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowAutoRedirect(false);
          setHasAutoNavigated(true);
          // Use setTimeout to prevent navigation during render
          setTimeout(() => {
            handleTrackOrder();
          }, 100); // Small delay for smooth transition
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleTrackOrder]); // Now handleTrackOrder is defined before this useEffect

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

  const handleGoHome = () => {
    // Create order data context for navigation
    const orderContext = {
      zoneId,
      restaurantId,
      tableNumber: tableId,
      customer: { userId }
    };

    // Use utility function for consistent navigation
    const targetRoute = generateHomeNavigationUrl(orderContext);
    navigate(targetRoute);
  };

  // Order status progression for tracking visualization
  const statusSteps = [
    { key: 'pending', label: 'Order Placed', icon: FaBell, description: 'Your order has been received and is being processed' },
    { key: 'confirmed', label: 'Confirmed & Preparing', icon: FaUtensils, description: 'Restaurant confirmed and preparing your order' },
    { key: 'ready', label: 'Ready', icon: FaCheckCircle, description: 'Your order is ready for pickup' },
    { key: 'completed', label: 'Completed', icon: FaCheckCircle, description: 'Order completed - Thank you!' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 text-gray-900 relative pb-safe flex items-center justify-center">
        {/* Auto-redirect notification */}
        {showAutoRedirect && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50"
          >
            <p className="text-sm font-medium">
              Redirecting to order tracking in {autoRedirectCount} second{autoRedirectCount !== 1 ? 's' : ''}...
            </p>
          </motion.div>
        )}

        {/* Hidden Receipt for PDF Generation */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <CustomerReceipt
            ref={receiptRef}
            orderDetails={currentOrder || {
              orderNumber: `TS${Date.now()}`,
              restaurantName: 'TableServe Restaurant',
              items: [],
              pricing: {
                subtotal: 0,
                taxes: 0,
                total: 0
              },
              tableNumber: tableId || 'N/A',
              createdAt: new Date().toISOString(),
              paymentMethod: 'Digital Payment',
              customer: {
                name: 'Valued Customer'
              }
            }}
          />
        </div>

        {/* Centered Success Message */}
        <div className="text-center px-6 max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl"
          >
            <FaCheckCircle className="text-6xl text-green-500" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-gray-800 font-fredoka mb-4"
          >
            Order Placed Successfully
          </motion.h1>

          {orderNumber && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6 mb-6"
            >
              <p className="text-lg text-gray-600 font-raleway mb-2">
                Order Number
              </p>
              <p className="text-2xl font-bold text-green-600 font-fredoka">
                {orderNumber}
              </p>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-lg text-gray-600 font-raleway"
          >
            Thank you for your order • Table {tableId}
          </motion.p>
        </div>
    </div>
  );
};

export default OrderSuccessScreen;