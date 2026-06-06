import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchDashboardStats } from '../../../store/slices/uiSlice';
import { useGetOrdersQuery, useUpdateOrderStatusMutation } from '../../../store/api/ordersApi';
import { selectIsConnected, selectConnectionStatus } from '../../../store/slices/realtimeSlice';
import RealTimeService from '../../../services/RealTimeService';

import RestaurantOrderNotifications from '../pages/RestaurantOrderNotifications';
import DashboardAnalyticsService from '../../../services/DashboardAnalyticsService';
import {
  FaShoppingCart,
  FaUtensils,
  FaTable,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaChartLine,
  FaUsers,
  FaStar,
  FaRupeeSign,
  FaSync,
  FaCircle,
  FaCrown,
  FaQrcode,
  FaPlus,
  FaRocket
} from 'react-icons/fa';
import SingleRestaurantLayout from './SingleRestaurantLayout';
import { usePlanRestrictions } from '../../subscription/components/PlanRestrictions';
import UpgradeTab from '../../subscription/components/UpgradeTab';
import browserNotificationService from '../../../shared/notifications/BrowserNotificationService';

const SingleRestaurantDashboard = () => {
  const { restaurantId } = useParams();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);
  const { stats, loading: dashboardLoading, error: dashboardError } = useSelector((state) => state.ui.dashboard);
  const isConnected = useSelector(selectIsConnected);
  const connectionStatus = useSelector(selectConnectionStatus);
  const navigate = useNavigate();

  // Local state
  const [timeRange, setTimeRange] = useState('today');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  // Use RTK Query to fetch orders - simplified query
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders
  } = useGetOrdersQuery(
    { role: 'restaurant_owner', entityId: restaurantId },
    { 
      skip: !restaurantId || !isAuthenticated,
      pollingInterval: 30000, // Poll every 30 seconds
      refetchOnMountOrArgChange: true
    }
  );

  // Use RTK Query mutation for updating order status (removed from dashboard - only used in order management)
  const [updateOrderStatusMutation] = useUpdateOrderStatusMutation();

  // Memoized data extraction to prevent unnecessary recalculations
  const { orders, liveOrders, completedOrders } = useMemo(() => {
    if (!ordersData) return { orders: [], liveOrders: [], completedOrders: [] };
    
    // Handle different response structures
    let allOrders = [];
    
    if (Array.isArray(ordersData)) {
      allOrders = ordersData;
    } else if (ordersData.data) {
      allOrders = ordersData.data;
    } else if (ordersData.orders) {
      allOrders = ordersData.orders;
    }
    
    // Separate orders by status
    const live = allOrders.filter(order => 
      ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status?.toLowerCase())
    );
    
    const completed = allOrders.filter(order => 
      ['completed', 'delivered'].includes(order.status?.toLowerCase())
    );
    
    return {
      orders: allOrders,
      liveOrders: live,
      completedOrders: completed
    };
  }, [ordersData]);

  // Plan restrictions integration
  const { 
    subscription, 
    currentCounts, 
    checkLimit, 
    PlanStatusBadge, 
    FeatureRestriction, 
    LimitReachedModal,
    PaymentModal,
    PaymentSuccessModal,
    handleUpgrade
  } = usePlanRestrictions();

  // Authentication check - run only once when component mounts
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.role !== 'restaurant_owner') {
      navigate('/login', { replace: true });
      return;
    }

    if (user.restaurantId != restaurantId) {
      navigate('/login', { replace: true });
      return;
    }
  }, [isAuthenticated, user, restaurantId, navigate]);

  // Calculate dashboard stats when orders data changes
  const calculateDashboardStats = useCallback(() => {
    // Always return fallback stats for new users or when no data is available
    if (!orders || orders.length === 0) {
      return DashboardAnalyticsService.getFallbackStats();
    }
    
    return DashboardAnalyticsService.getRestaurantDashboardStats(
      restaurantId, 
      orders, 
      liveOrders || []
    );
  }, [restaurantId, orders, liveOrders]);

  // Update dashboard stats when orders change - with null safety
  useEffect(() => {
    if (restaurantId) {
      const calculatedStats = calculateDashboardStats();
      dispatch({ 
        type: 'ui/fetchDashboardStats/fulfilled', 
        payload: { stats: calculatedStats } 
      });
      setLastRefresh(new Date());
    }
  }, [restaurantId, calculateDashboardStats, dispatch]);

  // Set up real-time notifications for new orders (Restaurant)
  useEffect(() => {
    if (!restaurantId) return;

    // Ensure browser notification permission is requested once (if supported)
    // Note: Some browsers require a user gesture to grant permission.
    browserNotificationService.init().catch(() => {
      // no-op; we'll still rely on in-tab behavior (sound/refetch)
    });

    const handleNewOrder = (orderData) => {
      console.log('🔔 New order received for restaurant dashboard:', orderData);

      // We are already subscribed to this restaurant's room.
      // Backend payload does not include restaurantId, so don't filter on it.

      // Show browser/desktop notification (permission-aware)
      try {
        browserNotificationService.showNewOrderNotification(orderData);
      } catch (e) {
        console.log('Browser notification not available:', e);
      }

      // Refresh orders to show the new order
      refetchOrders();
    };

    // Set up RealTimeService listeners
    let rtService;
    
    const initializeNotifications = async () => {
      try {
        const module = await import('../../../services/RealTimeService');
        rtService = module.default;
        
        // Listen for new orders
        rtService.addEventListener('new_order', handleNewOrder);
        
        // Join the restaurant room to receive notifications
        rtService.joinRoom('restaurant', restaurantId);
        
        console.log('🔔 Restaurant notification system initialized', { restaurantId });
      } catch (error) {
        console.error('Failed to initialize restaurant notification system:', error);
      }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      if (rtService) {
        try {
          rtService.removeEventListener('new_order', handleNewOrder);
          rtService.leaveRoom('restaurant', restaurantId);
        } catch (error) {
          console.error('Error cleaning up restaurant notification system:', error);
        }
      }
    };
  }, [restaurantId, refetchOrders]);

  // Removed handleUpdateOrderStatus function - status updates should only be done in Order Management page

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh orders data
      await refetchOrders();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchOrders]);

  // Handle new order notifications
  const handleOrderReceived = useCallback((orderData) => {
    setNewOrdersCount(prev => prev + 1);
    refetchOrders(); // This will trigger automatic stats recalculation
  }, [refetchOrders]);

  // Handle order update notifications
  const handleOrderUpdate = useCallback((updateData) => {
    refetchOrders(); // This will trigger automatic stats recalculation
  }, [refetchOrders]);

  // Memoized dashboard data with fallback
  const data = useMemo(() => {
    if (stats && stats[timeRange]) {
      return stats[timeRange];
    }
    // Return fallback data structure for new users or when no stats are available
    return {
      totalOrders: 0,
      totalRevenue: '₹0',
      popularItems: [],
      orderTrends: [],
      averageOrderValue: 0,
      completionRate: 0
    };
  }, [stats, timeRange]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': case 'ordered': return 'text-yellow-600 bg-yellow-100 border border-yellow-200';
      case 'confirmed': return 'text-blue-600 bg-blue-100 border border-blue-200';
      case 'preparing': case 'accepted': return 'text-blue-600 bg-blue-100 border border-blue-200';
      case 'ready': return 'text-green-600 bg-green-100 border border-green-200';
      case 'completed': case 'delivered': return 'text-gray-600 bg-gray-100 border border-gray-200';
      case 'cancelled': return 'text-red-600 bg-red-100 border border-red-200';
      default: return 'text-gray-600 bg-gray-100 border border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': case 'ordered': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': case 'accepted': return 'Preparing';
      case 'ready': return 'Ready';
      case 'completed': case 'delivered': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status || 'Unknown';
    }
  };

  // Show error state
  if (ordersError) {
    return (
      <SingleRestaurantLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <FaExclamationTriangle className="text-4xl mx-auto mb-2" />
            </div>
            <p className="text-theme-text-primary font-raleway mb-4">
              Failed to load dashboard data
            </p>
            <button
              onClick={handleManualRefresh}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-raleway"
            >
              Try Again
            </button>
          </div>
        </div>
      </SingleRestaurantLayout>
    );
  }

  return (
    <SingleRestaurantLayout>
      <div className="space-y-6 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm sm:text-base">
              Here's what's happening at {user?.restaurantName} today
            </p>
          </div>
          
            {/* Notification and Refresh Controls */}
            <div className="flex items-center space-x-4">
              {/* Order Notifications */}
              {/* <RestaurantOrderNotifications
                onOrderReceived={handleOrderReceived}
                onOrderUpdate={handleOrderUpdate}
              /> */}

              {/* Last Refresh Time */}
              <div className="text-gray-600 dark:text-gray-300 font-raleway text-xs">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>

              {/* Manual Refresh Button */}
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg transition-colors font-raleway text-sm"
              >
                <FaSync className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Updating' : 'Refresh'}</span>
              </button>
            </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <FaShoppingCart className="text-white text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">{data?.totalOrders || 0}</h3>
            <p className="text-theme-text-secondary font-raleway font-medium mb-1">Total Orders</p>
            <p className="text-theme-text-tertiary font-raleway text-sm">vs yesterday</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-secondary rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <FaRupeeSign className="text-white text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">{data?.totalRevenue || '₹0'}</h3>
            <p className="text-theme-text-secondary font-raleway font-medium mb-1">Revenue</p>
            <p className="text-theme-text-tertiary font-raleway text-sm">vs yesterday</p>
          </motion.div>
        </div>

        {/* Order Status Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-secondary rounded-2xl p-4 text-center shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <FaClock className="text-white text-sm" />
            </div>
            <p className="text-2xl font-fredoka text-yellow-600">
              {(liveOrders || []).filter(order => ['pending', 'ordered'].includes(order.status?.toLowerCase())).length}
            </p>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Pending</p>
          </div>
          <div className="bg-secondary rounded-2xl p-4 text-center shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <FaUtensils className="text-white text-sm" />
            </div>
            <p className="text-2xl font-fredoka text-blue-600">
              {(liveOrders || []).filter(order => ['confirmed', 'preparing', 'accepted'].includes(order.status?.toLowerCase())).length}
            </p>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Preparing</p>
          </div>
          <div className="bg-secondary rounded-2xl p-4 text-center shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <FaCheckCircle className="text-white text-sm" />
            </div>
            <p className="text-2xl font-fredoka text-green-600">
              {(liveOrders || []).filter(order => order.status?.toLowerCase() === 'ready').length}
            </p>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Ready</p>
          </div>
          <div className="admin-card rounded-2xl p-4 text-center">
            <div className="w-8 h-8 bg-theme-bg-tertiary rounded-lg flex items-center justify-center mx-auto mb-2">
              <FaCheckCircle className="text-status-success text-sm" />
            </div>
            <p className="text-2xl font-fredoka text-gray-600">
              {(completedOrders || []).length}
            </p>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Completed</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-secondary rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-fredoka text-theme-text-primary">Recent Orders</h2>
              <button 
                onClick={() => navigate(`/restaurant/${restaurantId}/orders/history`)}
                className="text-orange-500 hover:text-orange-600 font-raleway text-sm font-semibold transition-colors"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {/* Show mix of live orders and recent completed orders */}
              {[...(liveOrders || []), ...(completedOrders || []).slice(0, 2)]
                .sort((a, b) => new Date(b.createdAt || b.orderTime || 0) - new Date(a.createdAt || a.orderTime || 0))
                .slice(0, 5)
                .map((order) => (
                <div key={order.id || order._id} className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-gray-200 dark:border-gray-700 relative">
                  {/* Real-time indicator for live orders */}
                  {(liveOrders || []).find(live => (live.id || live._id) === (order.id || order._id)) && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  
                  {/* Completed indicator for completed orders */}
                  {(completedOrders || []).find(completed => (completed.id || completed._id) === (order.id || order._id)) && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 bg-status-success rounded-full"></div>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-orange-500 font-raleway font-medium text-sm">
                        #{order.orderNumber || order.id || order._id}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 font-raleway text-sm">
                        Table {order.tableNumber || order.table || 'N/A'}
                      </span>
                      <div className={`px-2 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">
                      {order.items?.length > 0 ? 
                        `${order.items.length} item${order.items.length > 1 ? 's' : ''}` :
                       order.orderItems?.length > 0 ?
                        `${order.orderItems.length} item${order.orderItems.length > 1 ? 's' : ''}` :
                       'No items'} 
                      {order.items?.length > 0 && ` • ${order.items.slice(0, 2).map(item => item.name || item.itemName).join(', ')}${order.items.length > 2 ? '...' : ''}`}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 font-raleway text-xs mt-1">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      }) : 
                       order.orderTime ? new Date(order.orderTime).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit'
                      }) : 
                       'Time not available'}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-theme-text-primary font-raleway font-semibold">
                      ₹{order.totalAmount || order.total || order.pricing?.total || 0}
                    </p>
                    
                    {/* Show completion status for completed orders */}
                    {(completedOrders || []).find(completed => (completed.id || completed._id) === (order.id || order._id)) && (
                      <div className="text-gray-500 font-raleway text-xs mt-1">
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Empty state */}
              {(!orders || orders.length === 0) && (
                <div className="text-center py-8">
                  <FaShoppingCart className="text-4xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 font-raleway">No orders yet today</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Top Menu Items */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="admin-card rounded-2xl p-4 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-fredoka text-theme-text-primary mb-6">Top Menu Items</h2>
            <div className="space-y-4">
              {(data?.popularItems || []).map((item, index) => (
                <div key={item.name} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-fredoka text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-theme-text-primary font-raleway font-medium">{item.name}</h4>
                    <p className="text-theme-text-secondary font-sans text-sm">{item.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 font-raleway font-semibold">{item.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Completed Orders Section */}
        {(completedOrders || []).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-secondary rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-fredoka text-theme-text-primary">Recently Completed Orders</h2>
              <span className="text-theme-text-tertiary font-raleway text-sm">
                {(completedOrders || []).length} completed today
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(completedOrders || []).slice(0, 6).map((order) => (
                <div key={order.id || order._id} className="bg-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600 dark:text-gray-300 font-sans font-medium text-sm">
                        #{order.orderNumber || order.id || order._id}
                      </span>
                      <div className="px-2 py-1 rounded-full text-xs font-raleway bg-status-success text-white">
                        Completed
                      </div>
                    </div>
                    <span className="text-theme-text-primary font-raleway font-semibold text-sm">
                      ₹{order.totalAmount || order.total || order.pricing?.total || 0}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 font-raleway text-xs">
                    Table {order.tableNumber || order.table || 'N/A'} • {' '}
                    {order.items?.length || order.orderItems?.length || 0} items
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 font-raleway text-xs mt-1">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : 
                     order.orderTime ? new Date(order.orderTime).toLocaleString() : 
                     'No time available'}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Plan Restrictions Modals */}
        {LimitReachedModal}
        {PaymentModal}
        {PaymentSuccessModal}
        

      </div>
    </SingleRestaurantLayout>
  );
};

export default SingleRestaurantDashboard;