import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaUtensils, FaMotorcycle, FaCheckCircle, FaClock, FaDownload, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import Receipt from '../../components/common/Receipt';
import { downloadPdf } from '../../utils/downloadUtils';
import { selectCurrentOrder, fetchOrderDetails } from '../../store/slices/ordersSlice';
import { loadStateWithOrderRecovery } from '../../store/middleware/persistenceMiddleware';
import OrderProcessingService from '../../services/OrderProcessingService';

const OrderTrackingScreen = () => {
  const { restaurantId, tableId, userId, zoneId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const receiptRef = useRef();

  // Debug logging to help troubleshoot route parameters (only log once per mount)
  React.useEffect(() => {
    console.log('OrderTrackingScreen mounted with params:', { restaurantId, tableId, userId, zoneId });
  }, []); // Empty dependency array to log only once on mount

  // Get real order data from Redux store
  const currentOrder = useSelector(selectCurrentOrder);
  const { currentOrderLoading, currentOrderError } = useSelector((state) => state.orders);

  // State for handling refresh scenarios
  const [isRecovering, setIsRecovering] = React.useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = React.useState(false);
  const [hasValidOrder, setHasValidOrder] = React.useState(false);
  const [localOrder, setLocalOrder] = React.useState(null); // Direct localStorage order

  // Immediate order detection - check localStorage first
  React.useEffect(() => {
    const entityId = restaurantId || zoneId;
    if (!entityId) return;

    console.log('OrderTrackingScreen: Immediate order detection starting...');
    
    // Step 1: Check for recent order ID
    const recentOrderKey = `recent_order_${entityId}_${tableId}_${userId}`;
    const recentOrderId = localStorage.getItem(recentOrderKey);
    
    if (recentOrderId) {
      console.log('OrderTrackingScreen: Found recent order ID:', recentOrderId);
      
      // Step 2: Try to get order directly from localStorage
      const orderStorageKey = restaurantId ? `restaurant_orders_${restaurantId}` : `zone_orders_${zoneId}`;
      const entityOrders = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
      const directOrder = entityOrders.find(o => o.orderId === recentOrderId);
      
      if (directOrder) {
        console.log('OrderTrackingScreen: Found order directly in localStorage:', directOrder);
        setLocalOrder(directOrder);
        setHasValidOrder(true);
        
        // Also try to update Redux state
        dispatch({
          type: 'orders/fetchOrderDetails/fulfilled',
          payload: directOrder
        });
        return;
      }
    }
    
    // Step 3: If no recent order ID, search through all orders for this table
    const orderStorageKey = restaurantId ? `restaurant_orders_${restaurantId}` : `zone_orders_${zoneId}`;
    const entityOrders = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
    
    if (entityOrders.length > 0) {
      const tableOrders = entityOrders.filter(order => {
        const matchesTable = order.tableId === tableId || order.tableNumber === tableId;
        const matchesUser = order.userId === userId || !order.userId;
        return matchesTable && matchesUser;
      });
      
      if (tableOrders.length > 0) {
        const latestOrder = tableOrders[0]; // Most recent order
        console.log('OrderTrackingScreen: Found latest order for table:', latestOrder);
        
        setLocalOrder(latestOrder);
        setHasValidOrder(true);
        
        // Store as recent order
        localStorage.setItem(recentOrderKey, latestOrder.orderId);
        
        // Update Redux state
        dispatch({
          type: 'orders/fetchOrderDetails/fulfilled',
          payload: latestOrder
        });
        return;
      }
    }
    
    console.log('OrderTrackingScreen: No orders found in immediate detection');
  }, [restaurantId, zoneId, tableId, userId, dispatch]);

  // Fetch order details if not available (fallback mechanism)
  useEffect(() => {
    console.log('OrderTrackingScreen: Checking if fallback fetch needed...', {
      hasCurrentOrder: !!currentOrder,
      hasLocalOrder: !!localOrder,
      hasValidOrder,
      recoveryAttempted,
      currentOrderLoading
    });
    
    // Only attempt fallback if we don't have any order data and haven't tried recovery yet
    if (!currentOrder && !localOrder && !hasValidOrder && !currentOrderLoading && !recoveryAttempted) {
      console.log('OrderTrackingScreen: Starting fallback fetch mechanism...');
      setRecoveryAttempted(true);
      setIsRecovering(true);
      
      const entityId = restaurantId || zoneId;
      if (entityId) {
        const recentOrderKey = `recent_order_${entityId}_${tableId}_${userId}`;
        const recentOrderId = localStorage.getItem(recentOrderKey);
        
        console.log('OrderTrackingScreen: Fallback - trying recent order ID:', recentOrderId);
        
        if (recentOrderId) {
          // Try Redux fetch as fallback
          dispatch(fetchOrderDetails({ orderId: recentOrderId }))
            .then((result) => {
              console.log('OrderTrackingScreen: Fallback Redux fetch result:', result);
              if (result.payload) {
                setHasValidOrder(true);
              } else {
                console.log('OrderTrackingScreen: Fallback Redux fetch failed, trying direct recovery');
                attemptDirectOrderRecovery();
              }
              setIsRecovering(false);
            })
            .catch((error) => {
              console.error('OrderTrackingScreen: Fallback Redux fetch error:', error);
              attemptDirectOrderRecovery();
              setIsRecovering(false);
            });
        } else {
          console.log('OrderTrackingScreen: No recent order ID, trying direct recovery');
          attemptDirectOrderRecovery();
        }
      } else {
        console.log('OrderTrackingScreen: No entityId provided');
        setIsRecovering(false);
      }
    }
  }, [dispatch, currentOrder, localOrder, hasValidOrder, restaurantId, zoneId, tableId, userId, currentOrderLoading, recoveryAttempted]);

  // Direct order recovery from OrderProcessingService
  const attemptDirectOrderRecovery = () => {
    try {
      const entityId = restaurantId || zoneId;
      
      // First, try to get the recent order ID
      const recentOrderKey = `recent_order_${entityId}_${tableId}_${userId}`;
      const recentOrderId = localStorage.getItem(recentOrderKey);
      
      console.log('OrderTrackingScreen: Direct recovery starting...', {
        entityId,
        recentOrderKey,
        recentOrderId,
        tableId,
        userId
      });
      
      if (recentOrderId) {
        // Try to get order directly from OrderProcessingService
        const order = OrderProcessingService.getOrderById(recentOrderId);
        
        if (order) {
          console.log('OrderTrackingScreen: Direct recovery - found order via OrderProcessingService:', order);
          
          // Manually set the current order in Redux
          dispatch({
            type: 'orders/fetchOrderDetails/fulfilled',
            payload: order
          });
          
          setHasValidOrder(true);
          setIsRecovering(false);
          return;
        } else {
          console.log('OrderTrackingScreen: Direct recovery - order not found by ID, searching storage...');
        }
      }
      
      // If no recent order ID or order not found by ID, search through all orders
      const orderStorageKey = restaurantId ? `restaurant_orders_${restaurantId}` : `zone_orders_${zoneId}`;
      const entityOrders = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
      
      console.log('OrderTrackingScreen: Direct recovery - found entity orders:', entityOrders.length);
      
      if (entityOrders.length > 0) {
        // Get the most recent order for this table and user
        const tableOrders = entityOrders.filter(order => {
          const matchesTable = order.tableId === tableId || order.tableNumber === tableId;
          const matchesUser = order.userId === userId || !order.userId; // Allow orders without userId
          
          console.log('OrderTrackingScreen: Checking order:', {
            orderId: order.orderId,
            orderTableId: order.tableId,
            orderTableNumber: order.tableNumber,
            orderUserId: order.userId,
            targetTableId: tableId,
            targetUserId: userId,
            matchesTable,
            matchesUser
          });
          
          return matchesTable && matchesUser;
        });
        
        console.log('OrderTrackingScreen: Direct recovery - filtered table orders:', tableOrders.length);
        
        if (tableOrders.length > 0) {
          const latestOrder = tableOrders[0]; // Already sorted by latest first
          console.log('OrderTrackingScreen: Direct recovery - using latest order:', latestOrder);
          
          // Store this as recent order for future use
          localStorage.setItem(recentOrderKey, latestOrder.orderId);
          
          // Manually set the current order in Redux
          dispatch({
            type: 'orders/fetchOrderDetails/fulfilled',
            payload: latestOrder
          });
          
          setHasValidOrder(true);
        } else {
          console.log('OrderTrackingScreen: Direct recovery - no matching table orders found');
        }
      } else {
        console.log('OrderTrackingScreen: Direct recovery - no orders in storage');
      }
    } catch (error) {
      console.error('OrderTrackingScreen: Direct recovery error:', error);
    } finally {
      setIsRecovering(false);
    }
  };

  // Debug function to check what's in localStorage
  const debugLocalStorage = () => {
    console.log('=== OrderTrackingScreen Debug Info ===');
    console.log('Route params:', { restaurantId, tableId, userId, zoneId });
    console.log('Current Redux state:', {
      currentOrder,
      currentOrderLoading,
      currentOrderError,
      hasValidOrder,
      isRecovering,
      recoveryAttempted
    });
    
    const entityId = restaurantId || zoneId;
    const recentOrderKey = `recent_order_${entityId}_${tableId}_${userId}`;
    const recentOrderId = localStorage.getItem(recentOrderKey);
    
    console.log('Recent order lookup:', {
      key: recentOrderKey,
      value: recentOrderId
    });
    
    // Check localStorage for order data
    const orderStorageKey = restaurantId ? `restaurant_orders_${restaurantId}` : `zone_orders_${zoneId}`;
    const entityOrders = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
    
    console.log('Entity orders in storage:', {
      key: orderStorageKey,
      count: entityOrders.length,
      orders: entityOrders.map(o => ({
        orderId: o.orderId,
        tableId: o.tableId,
        userId: o.userId,
        status: o.status,
        createdAt: o.createdAt
      }))
    });
    
    console.log('=== End Debug Info ===');
  };
  
  // Force order recovery function
  const forceOrderRecovery = () => {
    console.log('OrderTrackingScreen: Forcing complete order recovery...');
    
    // Clear all states
    setRecoveryAttempted(false);
    setIsRecovering(false);
    setHasValidOrder(false);
    setLocalOrder(null);
    
    // Clear Redux current order
    dispatch({ type: 'orders/clearCurrentOrder' });
    
    // Trigger immediate detection again
    setTimeout(() => {
      const entityId = restaurantId || zoneId;
      if (!entityId) return;

      console.log('OrderTrackingScreen: Force recovery - immediate detection starting...');
      
      // Check for recent order ID
      const recentOrderKey = `recent_order_${entityId}_${tableId}_${userId}`;
      const recentOrderId = localStorage.getItem(recentOrderKey);
      
      if (recentOrderId) {
        console.log('OrderTrackingScreen: Force recovery - found recent order ID:', recentOrderId);
        
        // Get order directly from localStorage
        const orderStorageKey = restaurantId ? `restaurant_orders_${restaurantId}` : `zone_orders_${zoneId}`;
        const entityOrders = JSON.parse(localStorage.getItem(orderStorageKey) || '[]');
        const directOrder = entityOrders.find(o => o.orderId === recentOrderId);
        
        if (directOrder) {
          console.log('OrderTrackingScreen: Force recovery - found order directly:', directOrder);
          setLocalOrder(directOrder);
          setHasValidOrder(true);
          
          // Update Redux state
          dispatch({
            type: 'orders/fetchOrderDetails/fulfilled',
            payload: directOrder
          });
          return;
        }
      }
      
      // If no direct order found, try the direct recovery mechanism
      attemptDirectOrderRecovery();
    }, 100);
  };
  
  // Debug localStorage on mount
  React.useEffect(() => {
    debugLocalStorage();
  }, []);

  // Real-time clock
  const [currentTime, setCurrentTime] = React.useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Enhanced order details with real data and loading states
  // Use either Redux currentOrder or directly found localOrder
  const activeOrder = currentOrder || localOrder;
  const orderDetails = activeOrder || {
    orderId: (currentOrderLoading || isRecovering) ? 'Loading...' : (!recoveryAttempted ? 'Checking...' : 'No Order Found'),
    items: [],
    grandTotal: 0,
    createdAt: new Date().toISOString(),
    tableId: tableId || 'N/A',
    restaurantId: restaurantId || zoneId || 'N/A',
    status: (currentOrderLoading || isRecovering) ? 'loading' : (!recoveryAttempted ? 'checking' : 'not_found')
  };

  // Show loading state during recovery
  const isLoading = currentOrderLoading || isRecovering || (!recoveryAttempted && !activeOrder);
  const showNotFound = recoveryAttempted && !activeOrder && !isLoading;
  
  // Update hasValidOrder when we have an active order
  React.useEffect(() => {
    if (activeOrder && activeOrder.orderId && activeOrder.orderId !== 'Loading...' && activeOrder.orderId !== 'Checking...' && activeOrder.orderId !== 'No Order Found') {
      setHasValidOrder(true);
    }
  }, [activeOrder]);

  // Calculate order time
  const orderDate = new Date(orderDetails.createdAt);
  const orderTime = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Calculate estimated delivery time (20-30 minutes from order time)
  const estimatedDeliveryMinutes = orderDetails.estimatedTime || 25;
  const estimatedTime = new Date(orderDate.getTime() + estimatedDeliveryMinutes * 60000);

  // Enhanced status mapping with preparation and delivery colors
  const getStatusInfo = (status) => {
    switch (status) {
      case 'ordered':
      case 'new':
        return { 
          text: 'Order Received', 
          color: 'text-blue-600', 
          bgColor: 'from-blue-50 to-blue-100',
          progressColor: 'bg-blue-500',
          icon: FaCheckCircle,
          description: 'Your order has been received and is being processed',
          progress: 25
        };
      case 'confirmed':
        return { 
          text: 'Order Confirmed', 
          color: 'text-orange-600', 
          bgColor: 'from-orange-50 to-orange-100',
          progressColor: 'bg-orange-500',
          icon: FaUtensils,
          description: 'Your order has been confirmed and preparation will begin shortly',
          progress: 50
        };
      case 'preparing':
        return { 
          text: 'Preparing Your Order', 
          color: 'text-yellow-600', 
          bgColor: 'from-yellow-50 to-yellow-100',
          progressColor: 'bg-yellow-500',
          icon: FaUtensils,
          description: 'Your delicious meal is being prepared with care',
          progress: 75
        };
      case 'ready':
        return { 
          text: 'Ready for Pickup', 
          color: 'text-green-600', 
          bgColor: 'from-green-50 to-green-100',
          progressColor: 'bg-green-500',
          icon: FaCheckCircle,
          description: 'Your order is ready! Please collect from the counter',
          progress: 90
        };
      case 'out_for_delivery':
      case 'delivering':
        return { 
          text: 'On the Way', 
          color: 'text-purple-600', 
          bgColor: 'from-purple-50 to-purple-100',
          progressColor: 'bg-purple-500',
          icon: FaMotorcycle,
          description: 'Your order is on the way to your table',
          progress: 95
        };
      case 'delivered':
      case 'completed':
        return { 
          text: 'Delivered', 
          color: 'text-green-500', 
          bgColor: 'from-green-50 to-emerald-50',
          progressColor: 'bg-green-500',
          icon: FaCheckCircle,
          description: 'Your order has been successfully delivered. Enjoy your meal!',
          progress: 100
        };
      case 'cancelled':
        return { 
          text: 'Cancelled', 
          color: 'text-red-500', 
          bgColor: 'from-red-50 to-red-100',
          progressColor: 'bg-red-500',
          icon: FaClock,
          description: 'This order has been cancelled',
          progress: 0
        };
      case 'loading':
        return { 
          text: 'Loading Order...', 
          color: 'text-blue-500', 
          bgColor: 'from-blue-50 to-blue-100',
          progressColor: 'bg-blue-400',
          icon: FaSpinner,
          description: 'Fetching your order status...',
          progress: 0
        };
      case 'checking':
        return { 
          text: 'Checking Order...', 
          color: 'text-blue-500', 
          bgColor: 'from-blue-50 to-blue-100',
          progressColor: 'bg-blue-400',
          icon: FaSpinner,
          description: 'Looking for your order details...',
          progress: 0
        };
      case 'not_found':
      default:
        return { 
          text: showNotFound ? 'Order Not Found' : 'Checking Order...', 
          color: showNotFound ? 'text-red-500' : 'text-blue-500', 
          bgColor: showNotFound ? 'from-red-50 to-red-100' : 'from-blue-50 to-blue-100',
          progressColor: showNotFound ? 'bg-red-400' : 'bg-blue-400',
          icon: showNotFound ? FaExclamationTriangle : FaSpinner,
          description: showNotFound ? 
            'Unable to find order details. This may happen if the order was placed in a different session.' :
            'Searching for your order...',
          progress: 0
        };
    }
  };

  const statusInfo = getStatusInfo(orderDetails.status);
  const StatusIcon = statusInfo.icon;

  const handleDownloadReceipt = () => {
    // Use either Redux currentOrder or local order data for receipt generation
    const orderForReceipt = activeOrder || {
      orderId: orderDetails.orderId || `TS${Date.now()}`,
      restaurantName: 'TableServe Restaurant',
      items: orderDetails.items || [],
      subtotal: orderDetails.subtotal || orderDetails.grandTotal || 0,
      taxes: orderDetails.taxes || (orderDetails.grandTotal || 0) * 0.1,
      total: orderDetails.grandTotal || orderDetails.total || 0,
      tableNumber: orderDetails.tableId || tableId || 'N/A',
      createdAt: orderDetails.createdAt || new Date().toISOString(),
      paymentMethod: orderDetails.paymentMethod || 'Digital Payment'
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
          orderDetails={activeOrder || {
            orderId: orderDetails.orderId || `TS${Date.now()}`,
            restaurantName: 'TableServe Restaurant',
            items: orderDetails.items || [],
            subtotal: orderDetails.subtotal || orderDetails.grandTotal || 0,
            taxes: orderDetails.taxes || (orderDetails.grandTotal || 0) * 0.1,
            total: orderDetails.grandTotal || orderDetails.total || 0,
            tableNumber: orderDetails.tableId || tableId || 'N/A',
            createdAt: orderDetails.createdAt || new Date().toISOString(),
            paymentMethod: orderDetails.paymentMethod || 'Digital Payment'
          }}
        />
      </div>

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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-fredoka">Track Your Order</h1>
              <div className="flex items-center space-x-2">
                <FaClock className="text-gray-500 text-xs sm:text-sm" />
                <span className="text-xs sm:text-sm text-gray-500 font-raleway">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-gray-100 p-6 sm:p-8 relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/5 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-6 -translate-x-6"></div>
          {/* Order Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 text-center mb-6 sm:mb-8"
          >
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className="text-center sm:text-left">
                  <h2 className="text-lg sm:text-xl font-bold text-accent font-fredoka">
                    Order #{orderDetails.orderId || 'Loading...'}
                  </h2>
                  <p className="text-sm text-gray-500 font-raleway mt-1">
                    Table {orderDetails.tableId || tableId || 'N/A'}
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-500 font-raleway">Ordered at</p>
                  <p className="text-sm sm:text-base font-bold text-accent font-fredoka">
                    {orderTime}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Status Display with Progress Bar and Colors */}
          <div className={`bg-gradient-to-r ${statusInfo.bgColor} rounded-2xl p-6 mb-6 sm:mb-8 text-center relative z-10 border-2 border-opacity-20 border-gray-200`}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex flex-col items-center space-y-4"
            >
              {/* Status Icon with Animation */}
              <div className={`relative p-4 rounded-full ${statusInfo.color === 'text-gray-500' ? 'bg-gray-100' : 'bg-white'} shadow-lg`}>
                <StatusIcon 
                  className={`text-4xl sm:text-5xl ${statusInfo.color} ${
                    orderDetails.status === 'loading' ? 'animate-spin' : 
                    orderDetails.status === 'preparing' ? 'animate-pulse' : ''
                  }`} 
                />
                {orderDetails.status === 'preparing' && (
                  <div className="absolute inset-0 rounded-full border-4 border-yellow-400 animate-ping opacity-30"></div>
                )}
                {orderDetails.status === 'out_for_delivery' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-bounce"></div>
                )}
              </div>
              
              {/* Status Text */}
              <div className="space-y-2">
                <p className={`text-2xl sm:text-3xl font-bold font-fredoka ${statusInfo.color}`}>
                  {statusInfo.text}
                </p>
                <p className="text-sm sm:text-base text-gray-600 font-raleway max-w-md">
                  {statusInfo.description}
                </p>
              </div>

              {/* Progress Bar Removed */}

              {/* Estimated Time */}
              {orderDetails.status !== 'loading' && orderDetails.status !== 'cancelled' && orderDetails.status !== 'not_found' && orderDetails.status !== 'completed' && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <FaClock className="text-xs" />
                  <span className="font-raleway">
                    {orderDetails.status === 'preparing' ? 'Estimated ready by' : 'Estimated completion'}: {estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Enhanced Order Summary with Loading States */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 mb-6 sm:mb-8 relative z-10">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-3">
                  <FaSpinner className="animate-spin text-2xl text-accent" />
                  <span className="text-lg font-fredoka text-gray-600">
                    {isRecovering ? 'Recovering Order Details...' : 'Loading Order Details...'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mx-auto"></div>
                </div>
                {isRecovering && (
                  <p className="text-sm text-gray-500 font-raleway">
                    Attempting to recover your order from previous session...
                  </p>
                )}
              </div>
            </div>
          ) : showNotFound ? (
            <div className="bg-white rounded-2xl border border-red-100 p-6 sm:p-8 mb-6 sm:mb-8 relative z-10">
              <div className="text-center space-y-4">
                <FaExclamationTriangle className="text-4xl mx-auto text-red-400" />
                <div>
                  <p className="font-raleway text-lg font-medium text-red-600">Order Not Found</p>
                  <p className="font-raleway text-sm mt-2 text-gray-600">
                    Your order could not be found. This may happen when:
                  </p>
                  <ul className="font-raleway text-xs mt-2 text-gray-500 space-y-1">
                    <li>• The page was refreshed after a long time</li>
                    <li>• The order was placed in a different browser session</li>
                    <li>• The order data has been cleared from storage</li>
                  </ul>
                  <div className="mt-4 space-y-2">
                    <p className="font-raleway text-sm text-blue-600 font-medium">
                      Please scan the QR code again to place a new order.
                    </p>
                    <button
                      onClick={forceOrderRecovery}
                      className="mx-auto block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Try Recovery Again
                    </button>
                    <button
                      onClick={debugLocalStorage}
                      className="mx-auto block px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 transition-colors"
                    >
                      Debug Info
                    </button>
                  </div>
                  
                  {/* Debug Status Display (only in development) */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left">
                      <strong>Debug Status:</strong><br/>
                      Redux Order: {currentOrder ? 'Found' : 'None'}<br/>
                      Local Order: {localOrder ? 'Found' : 'None'}<br/>
                      Has Valid: {hasValidOrder.toString()}<br/>
                      Loading: {isLoading.toString()}<br/>
                      Recovery Attempted: {recoveryAttempted.toString()}<br/>
                      Active Order ID: {activeOrder?.orderId || 'None'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : orderDetails.items && orderDetails.items.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8 relative z-10">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 font-fredoka mb-4 text-center">Order Summary</h3>
              <div className="space-y-3">
                {orderDetails.items.map((item, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex justify-between items-center py-3 px-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 bg-gradient-to-r from-accent to-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                        {item.quantity}
                      </span>
                      <span className="text-sm sm:text-base text-gray-700 font-raleway font-medium">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-accent font-fredoka">
                      ₹{((item.quantity || 1) * (item.price || 0)).toFixed(2)}
                    </span>
                  </motion.div>
                ))}
                
                {/* Subtotal, Tax, and Total */}
                {orderDetails.subtotal && (
                  <div className="border-t-2 border-gray-200 pt-4 mt-4 space-y-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 font-raleway">Subtotal</span>
                      <span className="text-sm font-medium text-gray-700 font-fredoka">
                        ₹{orderDetails.subtotal.toFixed(2)}
                      </span>
                    </div>
                    {orderDetails.taxes && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-raleway">Taxes & Fees</span>
                        <span className="text-sm font-medium text-gray-700 font-fredoka">
                          ₹{orderDetails.taxes.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {/* Payment Method Display */}
                    {orderDetails.paymentMethod && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-raleway">Payment Method</span>
                        <span className="text-sm font-medium text-gray-700 font-fredoka capitalize">
                          {orderDetails.paymentMethod === 'digital' ? 'Digital Payment' : 
                           orderDetails.paymentMethod === 'cash' ? 'Cash Payment' : 
                           orderDetails.paymentMethod === 'card' ? 'Card Payment' : 
                           orderDetails.paymentMethod}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-lg font-bold text-gray-800 font-fredoka">Total</span>
                      <span className="text-xl font-bold text-accent font-fredoka">
                        ₹{(orderDetails.grandTotal || orderDetails.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // This case should not occur with the new loading states
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 mb-6 sm:mb-8 relative z-10 text-center">
              <div className="text-gray-500 space-y-3">
                <FaClock className="text-4xl mx-auto text-gray-400" />
                <div>
                  <p className="font-raleway text-lg font-medium text-gray-600">Unexpected State</p>
                  <p className="font-raleway text-sm mt-2 text-gray-400">
                    Something unexpected happened. Please try refreshing the page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons with Enhanced States */}
          <div className="space-y-4 sm:space-y-5 relative z-10">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleDownloadReceipt}
              disabled={!hasValidOrder || isLoading}
              className={`w-full py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-bold font-fredoka text-lg sm:text-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3 touch-manipulation ${
                (!hasValidOrder || isLoading) 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              <FaDownload className="text-lg sm:text-xl" />
              <span>
                {isLoading ? 'Loading...' : 
                 !hasValidOrder ? 'Receipt Not Available' : 
                 'Download Receipt'}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                let homeRoute;
                if (zoneId && tableId && userId) {
                  // For zone users, navigate to shop selection
                  homeRoute = `/tableserve/zone/${zoneId}/table/${tableId}/user/${userId}/shops`;
                } else if (zoneId && tableId) {
                  // For zone users without userId, navigate to shop selection
                  homeRoute = `/tableserve/zone/${zoneId}/table/${tableId}/shops`;
                } else if (restaurantId && tableId && userId) {
                  // For restaurant users, navigate to menu
                  homeRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/user/${userId}/menu`;
                } else if (restaurantId && tableId) {
                  // For restaurant users without userId, navigate to menu
                  homeRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/menu`;
                } else {
                  homeRoute = '/tableserve';
                }
                console.log('Navigating to home:', homeRoute);
                navigate(homeRoute);
              }}
              className="w-full bg-gradient-to-r from-accent to-red-500 text-white py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-bold font-fredoka text-lg sm:text-xl shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3 touch-manipulation hover:from-orange-600 hover:to-red-600"
            >
              <span>
                {isLoading ? 'Loading...' : 
                 showNotFound ? 'Place New Order' : 
                 'Back to Menu'}
              </span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderTrackingScreen;