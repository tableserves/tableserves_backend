import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchDashboardStats } from '../../store/slices/uiSlice';
import { fetchOrders, updateOrderStatus } from '../../store/slices/ordersSlice';
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
import { usePlanRestrictions } from '../subscription/PlanRestrictions';
import UpgradeTab from '../subscription/UpgradeTab';

const SingleRestaurantDashboard = () => {
  const { restaurantId } = useParams();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.ui.auth);
  console.log('User in SingleRestaurantDashboard:', user);
  const { stats, loading: dashboardLoading, error: dashboardError } = useSelector((state) => state.ui.dashboard);
  const { orders, loading: ordersLoading, error: ordersError } = useSelector((state) => state.orders);
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('today');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

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
      navigate('/tableserve/login', { replace: true });
      return;
    }

    if (user.role !== 'restaurant_owner') {
      navigate('/tableserve/login', { replace: true });
      return;
    }

    if (user.restaurantId != restaurantId) {
      navigate('/tableserve/login', { replace: true });
      return;
    }
  }, []);

  useEffect(() => {
    if (restaurantId) {
      const fetchData = async () => {
        setRefreshing(true);
        try {
          await dispatch(fetchDashboardStats('restaurant_owner'));
          await dispatch(fetchOrders({ role: 'restaurant_owner', entityId: restaurantId }));
          setLastRefresh(new Date());
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setRefreshing(false);
        }
      };
      
      fetchData();
    }
  }, [dispatch, restaurantId]);

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    dispatch(updateOrderStatus({ orderId, newStatus, user }));
  };

  const data = stats ? stats[timeRange] : null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'preparing': return 'text-blue-400 bg-blue-500/20';
      case 'ready': return 'text-green-400 bg-green-500/20';
      case 'completed': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await dispatch(fetchDashboardStats('restaurant_owner'));
      await dispatch(fetchOrders({ role: 'restaurant_owner', entityId: restaurantId }));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (dashboardLoading || ordersLoading || !data) {
    return (
      <SingleRestaurantLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading dashboard...</p>
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
            <h1 className="text-2xl sm:text-3xl font-fredoka text-gray-900 dark:text-white mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm sm:text-base">
              Here's what's happening at {user?.restaurantName} today
            </p>
          </div>
          
          {/* Live Status and Refresh Controls */}
          <div className="flex items-center space-x-4">
            {/* Live Status Indicator */}
            <div className="flex items-center space-x-2">
              <FaCircle className={`text-xs ${
                refreshing ? 'text-yellow-400' : 'text-blue-400'
              } ${refreshing ? 'animate-pulse' : ''}`} />
              <span className="text-gray-600 dark:text-gray-300 font-raleway text-sm">
                {refreshing ? 'Updating...' : 'Manual'}
              </span>
            </div>
            
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
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <FaShoppingCart className="text-white text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-gray-900 dark:text-white mb-1">{data.totalOrders}</h3>
            <p className="text-gray-600 dark:text-gray-300 font-raleway font-medium mb-1">Total Orders</p>
            <p className="text-gray-500 dark:text-gray-400 font-raleway text-sm">vs yesterday</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <FaRupeeSign className="text-white text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-gray-900 dark:text-white mb-1">{data.totalRevenue}</h3>
            <p className="text-gray-600 dark:text-gray-300 font-raleway font-medium mb-1">Revenue</p>
            <p className="text-gray-500 dark:text-gray-400 font-raleway text-sm">vs yesterday</p>
          </motion.div>
        </div>

        {/* Order Status Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <FaClock className="text-white text-sm" />
            </div>
            <p className="text-2xl font-fredoka text-yellow-500">{data.pendingOrders}</p>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Pending</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <FaShoppingCart className="text-white text-sm" />
            </div>
            <p className="text-2xl font-fredoka text-blue-500">{data.preparingOrders}</p>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Preparing</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <FaCheckCircle className="text-white text-sm" />
            </div>
            <p className="text-2xl font-fredoka text-green-500">{data.readyOrders}</p>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Ready</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <FaCheckCircle className="text-white text-sm" />
            </div>
            <p className="text-2xl font-fredoka text-gray-500">{data.completedOrders}</p>
            <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Completed</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-fredoka text-gray-900 dark:text-white">Recent Orders</h2>
              <button className="text-orange-500 hover:text-orange-600 font-raleway text-sm font-semibold">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-orange-500 font-raleway font-medium">{order.id}</span>
                      <span className="text-gray-600 dark:text-gray-300 font-raleway text-sm">Table {order.table}</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(order.status)}`}>
                        {order.status}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">
                      {order.items.join(', ')}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 font-raleway text-xs mt-1">{order.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 dark:text-white font-raleway font-semibold">${order.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top Menu Items */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-lg sm:text-xl font-fredoka text-gray-900 dark:text-white mb-6">Top Menu Items</h2>
            <div className="space-y-4">
              {data.popularItems.map((item, index) => (
                <div key={item.name} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-fredoka text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-gray-900 dark:text-white font-raleway font-medium">{item.name}</h4>
                    <p className="text-gray-600 dark:text-gray-300 font-raleway text-sm">{item.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 font-raleway font-semibold">${item.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Plan Restrictions Modals */}
        {LimitReachedModal}
        {PaymentModal}
        {PaymentSuccessModal}
      </div>
    </SingleRestaurantLayout>
  );
};

export default SingleRestaurantDashboard;
