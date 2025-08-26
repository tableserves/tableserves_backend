import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../../store/slices/uiSlice';
import {
  FaRupeeSign,
  FaStore,
  FaUsers,
  FaChartLine,
  FaShoppingCart,
  FaStar,
  FaTable,
  FaEye,
  FaEdit,
  FaClock,
  FaMapMarkerAlt,
  FaUtensils,
  FaCrown,
  FaArrowUp
} from 'react-icons/fa';
import ZoneAdminLayout from './ZoneAdminLayout';
import { usePlanRestrictions } from '../subscription/PlanRestrictions';

const ZoneAdminDashboard = () => {
  const { zoneId } = useParams();
  const dispatch = useDispatch();
  const { stats, loading, error } = useSelector((state) => state.ui.dashboard);
  
  // Plan restrictions integration for zones
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

  useEffect(() => {
    dispatch(fetchDashboardStats('zone_admin'));
  }, [dispatch]);

  const vendors = stats?.topShops || [];
  const recentOrders = stats?.recentOrders || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return 'status-warning bg-status-warning-light';
      case 'ready': return 'status-success bg-status-success-light';
      case 'completed': return 'status-info bg-status-info-light';
      case 'active': return 'status-success bg-status-success-light';
      case 'inactive': return 'status-error bg-status-error-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  if (loading || !stats) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-theme-text-primary text-xl">Loading dashboard...</div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="w-full max-w-7xl mx-auto">
        <div className="space-y-4 lg:space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-fredoka text-theme-text-primary mb-2">
              Zone Dashboard
            </h1>
            <p className="text-sm sm:text-base text-theme-text-secondary font-raleway">
              Welcome to {stats?.zoneName} management panel
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-status-success rounded-xl flex items-center justify-center">
                  <FaRupeeSign className="text-theme-text-inverse text-xl" />
                </div>

              </div>
              <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
                {stats?.todayRevenue?.toLocaleString('en-IN') || '0'}
              </h3>
              <p className="text-theme-text-secondary font-raleway">Today's Revenue</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="admin-card rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-status-info rounded-xl flex items-center justify-center">
                  <FaStore className="text-theme-text-inverse text-xl" />
                </div>
              </div>
              <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">{vendors.length}</h3>
              <p className="text-theme-text-secondary font-raleway">Total Shops</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="admin-card rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-status-warning rounded-xl flex items-center justify-center">
                  <FaShoppingCart className="text-theme-text-inverse text-xl" />
                </div>
              </div>
              <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">{stats?.totalOrders || 0}</h3>
              <p className="text-theme-text-secondary font-raleway">Total Orders</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="admin-card rounded-2xl p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-theme-accent-primary rounded-xl flex items-center justify-center">
                  <FaRupeeSign className="text-theme-text-inverse text-xl" />
                </div>
              </div>
              <h3 className="text-2xl font-fredoka text-theme-text-primary mb-1">
                {stats?.totalRevenue?.toLocaleString('en-IN') || '0'}
              </h3>
              <p className="text-theme-text-secondary font-raleway">Total Revenue</p>
            </motion.div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vendor Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="admin-card rounded-2xl p-4 lg:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg lg:text-xl font-fredoka text-theme-text-primary">Vendor Performance Today</h2>
                <button className="text-theme-accent-primary hover:text-theme-accent-hover font-raleway text-sm">
                  View All
                </button>
              </div>

              <div className="space-y-4">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                          <FaUtensils className="text-accent" />
                        </div>
                        <div>
                          <h4 className="text-white font-raleway font-medium">{vendor.name}</h4>
                          <p className="text-white/60 font-raleway text-sm">{vendor.cuisine} • {vendor.owner}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(vendor.status)}`}>
                        {vendor.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-white font-fredoka">₹{vendor.todayRevenue}</p>
                        <p className="text-white/60 font-raleway text-xs">Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-fredoka">{vendor.todayOrders}</p>
                        <p className="text-white/60 font-raleway text-xs">Orders</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <FaStar className="text-yellow-400 text-sm" />
                          <p className="text-white font-fredoka">{vendor.rating}</p>
                        </div>
                        <p className="text-white/60 font-raleway text-xs">Rating</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="admin-card rounded-2xl p-4 lg:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg lg:text-xl font-fredoka text-theme-text-primary">Recent Orders</h2>
                <button className="text-theme-accent-primary hover:text-theme-accent-hover font-raleway text-sm">
                  View All
                </button>
              </div>

              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-white font-raleway font-medium">{order.customerName}</h4>
                        <p className="text-white/60 font-raleway text-sm">{order.vendor} • Table {order.table}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-fredoka">₹{order.total}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-white/70 font-raleway text-sm">{order.items.join(', ')}</p>
                      <p className="text-white/60 font-raleway text-sm">{order.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Zone Upgrade Section - Show for non-premium plans */}
          {subscription && subscription.key !== 'premium' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="admin-card rounded-2xl p-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200"
            >
              <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
                    <FaCrown className="text-white text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-fredoka text-orange-800 mb-1">
                      Unlock Zone Premium Features
                    </h3>
                    <p className="text-orange-700 font-raleway">
                      Get unlimited shops, advanced analytics, QR customization, and priority support
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => handleUpgrade('basic')}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-raleway font-semibold transition-colors flex items-center space-x-2"
                  >
                    <FaArrowUp className="text-sm" />
                    <span>Upgrade Zone</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Plan Restriction Modals for Zones */}
          {LimitReachedModal}
          {PaymentModal}
          {PaymentSuccessModal}

        </div>
      </div>
    </ZoneAdminLayout>
  );
};

export default ZoneAdminDashboard;
