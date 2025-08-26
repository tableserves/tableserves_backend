import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  FaRupeeSign,
  FaShoppingCart,
  FaStar,
  FaUtensils,
  FaChartLine,
  FaClock,
  FaUsers,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEye,
  FaEdit
} from 'react-icons/fa';
import ZoneShopLayout from './ZoneShopLayout';
import { fetchDashboardStats } from '../../store/slices/uiSlice';

const ZoneShopDashboard = () => {
  const { zoneId, shopId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.ui.auth);
  const { stats, loading, error } = useSelector((state) => state.ui.dashboard);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!user) {
      window.location.href = '/tableserve/login';
      return;
    }

    if (zoneId === ':zoneId' && user?.zoneId) {
      const correctPath = window.location.pathname.replace('/zone/:zoneId/', `/zone/${user.zoneId}/`);
      navigate(correctPath);
      return;
    }

    dispatch(fetchDashboardStats('zone_shop'));
  }, [dispatch, zoneId, user, navigate]);

  const recentOrders = stats?.recentOrders || [];
  const popularItems = stats?.popularItems || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return 'status-warning bg-status-warning-light';
      case 'ready': return 'status-success bg-status-success-light';
      case 'completed': return 'status-info bg-status-info-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  if (loading || !stats) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-secondary">Loading dashboard...</p>
          </div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ZoneShopLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Shop Dashboard</h1>
          <p className="text-theme-text-secondary font-raleway">Welcome back! Here's your shop overview for today.</p>
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
              <span className="text-status-success text-sm font-raleway">+{stats.weeklyGrowth}%</span>
            </div>
            <h3 className="text-2xl font-sans text-theme-text-primary mb-1">₹{(stats.todayRevenue || 0).toLocaleString('en-IN')}</h3>
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
                <FaShoppingCart className="text-theme-text-inverse text-xl" />
              </div>
              <span className="text-status-warning text-sm font-raleway">{stats.pendingOrders} pending</span>
            </div>
            <h3 className="text-2xl font-sans text-theme-text-primary mb-1">{stats.todayOrders || 0}</h3>
            <p className="text-theme-text-secondary font-raleway">Today's Orders</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card rounded-2xl p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-status-warning rounded-xl flex items-center justify-center">
                <FaStar className="text-theme-text-inverse text-xl" />
              </div>
              <span className="text-status-success text-sm font-raleway">Excellent</span>
            </div>
            <h3 className="text-2xl font-sans text-theme-text-primary mb-1">{stats.avgRating || 0}</h3>
            <p className="text-theme-text-secondary font-raleway">Average Rating</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card rounded-2xl p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-theme-accent-primary rounded-xl flex items-center justify-center">
                <FaUtensils className="text-theme-text-inverse text-xl" />
              </div>
              <span className="text-status-error text-sm font-raleway">Active</span>
            </div>
            <h3 className="text-2xl font-sans text-theme-text-primary mb-1">{stats.menuItems || 0}</h3>
            <p className="text-theme-text-secondary font-raleway">Menu Items</p>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-fredoka text-theme-text-primary">Recent Orders</h2>
              <button className="text-theme-accent-primary hover:text-theme-accent-hover font-raleway text-sm">View All</button>
            </div>

            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="bg-theme-bg-hover rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-theme-text-primary font-raleway font-medium">{order.customerName}</h4>
                      <p className="text-theme-text-secondary font-raleway text-sm">Table {order.table} • {order.time}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-theme-text-secondary font-raleway text-sm">{order.items.join(', ')}</p>
                    <p className="text-theme-text-primary font-sans font-medium">₹{order.total.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Popular Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-fredoka text-theme-text-primary">Popular Items Today</h2>
              <button className="text-theme-accent-primary hover:text-theme-accent-hover font-raleway text-sm">Manage Menu</button>
            </div>

            <div className="space-y-4">
              {popularItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-theme-accent-primary/20 rounded-lg flex items-center justify-center">
                      <span className="text-theme-accent-primary font-raleway font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="text-theme-text-primary font-raleway font-medium">{item.name}</h4>
                      <p className="text-theme-text-secondary font-raleway text-sm">{item.orders} orders</p>
                    </div>
                  </div>
                  <p className="text-theme-text-primary font-sans font-medium">₹{item.revenue.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>


      </div>
    </ZoneShopLayout>
  );
};

export default ZoneShopDashboard;
