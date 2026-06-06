import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaRupeeSign,
  FaShoppingCart,
  FaUtensils,
  FaClock,
  FaCheckCircle,
  FaChevronRight,
  FaStore,
  FaFire,
  FaExclamationCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import ZoneShopLayout from './ZoneShopLayout';
import { useGetLiveOrdersQuery } from '../../../store/api/ordersApi';
import ApiService from '../../../shared/api/ApiService';

const ZoneShopDashboard = () => {
  const { zoneId, shopId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.ui.auth);

  // Shop status state
  const [shopStatus, setShopStatus] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusMessageType, setStatusMessageType] = useState('');
  
  // NEW: State for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Use RTK Query
  const { 
    data: ordersData, 
    isLoading: ordersLoading, 
    error: ordersError,
  } = useGetLiveOrdersQuery({
    role: 'zone_shop',
    entityId: shopId
  }, {
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true
  });
  
  const orders = Array.isArray(ordersData) ? ordersData : [];

  const loadShopStatus = useCallback(async () => {
    try {
      const shopData = await ApiService.getZoneShopProfile(zoneId, shopId);
      if (shopData && shopData.status) {
        setShopStatus(shopData.status === 'active');
      } else {
        setShopStatus(true);
      }
    } catch (error) {
      console.error('❌ Failed to load shop status:', error);
      setShopStatus(true);
    }
  }, [zoneId, shopId]);

  const handleStatusClick = () => {
    setShowConfirmModal(true);
  };

  const confirmShopStatusToggle = async () => {
    setShowConfirmModal(false);
    if (statusLoading) return;
    setStatusLoading(true);
    setStatusMessage('');
    
    try {
      const newStatus = !shopStatus;
      const statusValue = newStatus ? 'active' : 'inactive';
      
      await ApiService.updateZoneShopStatus(zoneId, shopId, { status: statusValue });
      await loadShopStatus();
      
      setStatusMessage(`Shop is now ${newStatus ? 'Open' : 'Closed'}!`);
      setStatusMessageType('success');
      
      setTimeout(() => {
        setStatusMessage('');
        setStatusMessageType('');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to update shop status:', error);
      let errorMessage = 'Failed to update shop status. Please try again.';
      if (error.message.includes('403') || error.message.includes('Forbidden')) errorMessage = 'Permission denied. Please contact your zone admin.';
      else if (error.message.includes('401') || error.message.includes('Unauthorized')) errorMessage = 'Session expired. Please log in again.';
      else if (error.message.includes('Network')) errorMessage = 'Network error. Check connection and try again.';
      
      setStatusMessage(errorMessage);
      setStatusMessageType('error');
      
      setTimeout(() => {
        setStatusMessage('');
        setStatusMessageType('');
      }, 5000);
    } finally {
      setStatusLoading(false);
    }
  };
  
  useEffect(() => {
    if (shopId) {
      const cacheKeys = [`vendor_orders_${shopId}`, `zone_orders_${zoneId}`, `shop_orders_${shopId}`, `orders_${shopId}`, `vendor_live_orders_${shopId}`, `zone_live_orders_${zoneId}`];
      cacheKeys.forEach(key => { try { localStorage.removeItem(key); } catch (e) {} });
    }
  }, [zoneId, shopId, ordersData, orders, ordersLoading, ordersError]);

  useEffect(() => {
    if (!user) { window.location.href = '/login'; return; }
    if (zoneId === ':zoneId' && user?.zoneId) {
      navigate(window.location.pathname.replace('/zone/:zoneId/', `/zone/${user.zoneId}/`));
      return;
    }
    loadShopStatus();
  }, [zoneId, shopId, user, navigate, loadShopStatus]);

  // Dashboard Stats Processing...
  const dashboardStats = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return { todayRevenue: 0, todayOrders: 0, pendingOrders: 0, avgRating: null, menuItems: 0, weeklyGrowth: null };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt || order.orderTime || order.timing?.orderPlaced);
      return !isNaN(orderDate.getTime()) && orderDate >= today;
    });
    const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total || order.pricing?.total || 0), 0);
    const allCompletedOrders = orders.filter(order => order.status === 'completed' || !order.status);
    const totalRevenue = allCompletedOrders.reduce((sum, order) => sum + Number(order.total || order.pricing?.total || 0), 0);
    const pendingOrders = orders.filter(order => order.status === 'pending' || order.status === 'confirmed').length;
    const menuItemsSet = new Set();
    orders.forEach(order => { if (Array.isArray(order.items)) order.items.forEach(item => { if (item.name) menuItemsSet.add(item.name); }); });
    // Compute avgRating from real feedback on completed orders. weeklyGrowth
    // is left as null until we wire a real period-over-period query.
    const ratedOrders = allCompletedOrders.filter(o => Number(o.feedback?.rating) > 0);
    const avgRating = ratedOrders.length
      ? (ratedOrders.reduce((sum, o) => sum + Number(o.feedback.rating), 0) / ratedOrders.length).toFixed(1)
      : null;

    return {
      todayRevenue: todayRevenue > 0 ? todayRevenue : totalRevenue,
      todayOrders: todayOrders.length > 0 ? todayOrders.length : allCompletedOrders.length,
      pendingOrders,
      avgRating,
      menuItems: menuItemsSet.size,
      weeklyGrowth: null
    };
  }, [orders]);

  const recentOrders = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return [];
    return [...orders].sort((a, b) => new Date(b.createdAt || b.orderTime) - new Date(a.createdAt || a.orderTime)).slice(0, 5).map(order => {
        const orderTime = new Date(order.createdAt || order.orderTime || Date.now());
        const diffMinutes = Math.floor((new Date() - orderTime) / (1000 * 60));
        return {
          id: order.orderNumber || order.id || order._id || '#000', orderNumber: order.orderNumber || order.id || order._id || '#000',
          table: order.tableNumber || '1', total: order.total || order.pricing?.total || 0, status: order.status || 'pending',
          items: Array.isArray(order.items) ? order.items.map(item => item.name || 'Item') : ['No items'],
          time: diffMinutes < 1 ? 'Just now' : diffMinutes < 60 ? `${diffMinutes}m ago` : `${Math.floor(diffMinutes / 60)}h ago`,
        };
      });
  }, [orders]);

  const popularItems = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return [];
    const itemStats = new Map();
    orders.forEach(order => {
      if (Array.isArray(order.items)) order.items.forEach(item => {
          const existing = itemStats.get(item.name || 'Unknown Item') || { name: item.name || 'Unknown Item', orders: 0, revenue: 0 };
          existing.orders += item.quantity || 1; existing.revenue += (item.price || 0) * (item.quantity || 1);
          itemStats.set(item.name || 'Unknown Item', existing);
        });
    });
    return Array.from(itemStats.values()).sort((a, b) => b.orders - a.orders).slice(0, 5);
  }, [orders]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'preparing': return 'text-status-warning bg-status-warning/10 border-status-warning/20';
      case 'ready': return 'text-status-success bg-status-success/10 border-status-success/20';
      case 'completed': return 'text-status-info bg-status-info/10 border-status-info/20';
      default: return 'text-theme-text-secondary bg-theme-bg-secondary border-theme-border-primary';
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  if (ordersLoading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="w-16 h-16 border-4 border-theme-accent-primary/30 border-t-theme-accent-primary rounded-full" />
        </div>
      </ZoneShopLayout>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <ZoneShopLayout>
      <div className="space-y-8 w-full pb-10 px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-3xl sm:text-4xl font-fredoka text-theme-text-primary">
              Shop Dashboard
            </motion.h1>
          </div>
        </div>

        {/* Hero Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`relative overflow-hidden rounded-3xl p-6 md:p-8 border transition-colors duration-500 w-full flex flex-col md:flex-row justify-between items-center gap-6 ${
            shopStatus ? 'bg-status-success/5 border-status-success/20' : 'bg-status-error/5 border-status-error/20'
          }`}
        >
          <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-30 transition-colors duration-700 ${shopStatus ? 'bg-status-success' : 'bg-status-error'}`} />

          <div className="relative z-10 flex items-center gap-5 w-full">
            <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg transition-colors duration-500 ${shopStatus ? 'bg-status-success text-white' : 'bg-status-error text-white'}`}>
              <FaStore className="text-3xl" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-theme-text-primary mb-1">
                Shop is currently <span className={shopStatus ? 'text-status-success' : 'text-status-error'}>
                  {shopStatus ? 'Accepting Orders' : 'Offline'}
                </span>
              </h2>
              <p className="text-theme-text-secondary text-sm font-medium">
                {shopStatus ? 'Your menu is visible to customers in the zone.' : 'Your menu is hidden from customers.'}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
            {/* UPDATED BUTTON: Solid colors, stretches well, clean highlight */}
            <button
              onClick={handleStatusClick}
              disabled={statusLoading}
              className={`w-full md:w-auto inline-flex h-12 px-8 items-center justify-center rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                shopStatus 
                  ? 'bg-status-error text-white hover:bg-red-600 border border-transparent hover:border-red-400' 
                  : 'bg-status-success text-white hover:bg-green-600 border border-transparent hover:border-green-400'
              }`}
            >
              {statusLoading ? (
                <span className="flex items-center gap-2"><FaClock className="animate-spin" /> Updating</span>
              ) : (
                <span>{shopStatus ? 'Close Shop' : 'Open Shop'}</span>
              )}
            </button>

            <AnimatePresence>
              {statusMessage && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg w-full justify-center md:justify-end ${statusMessageType === 'success' ? 'text-status-success bg-status-success/10' : 'text-status-error bg-status-error/10'}`}>
                  {statusMessageType === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                  {statusMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="group bg-theme-bg-primary rounded-3xl p-6 border border-theme-border-primary shadow-sm hover:shadow-xl hover:border-status-success/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-status-success/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-status-success/10 text-status-success flex items-center justify-center text-xl mb-6"><FaRupeeSign /></div>
            <p className="text-theme-text-secondary text-sm font-semibold uppercase tracking-wider mb-1">Total Revenue</p>
            <h3 className="text-3xl font-bold text-theme-text-primary">₹{dashboardStats.todayRevenue.toLocaleString('en-IN')}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="group bg-theme-bg-primary rounded-3xl p-6 border border-theme-border-primary shadow-sm hover:shadow-xl hover:border-status-info/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-status-info/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-status-info/10 text-status-info flex items-center justify-center text-xl"><FaShoppingCart /></div>
              {dashboardStats.pendingOrders > 0 && (
                <span className="bg-status-warning/10 text-status-warning text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />{dashboardStats.pendingOrders} Pending</span>
              )}
            </div>
            <p className="text-theme-text-secondary text-sm font-semibold uppercase tracking-wider mb-1">Total Orders</p>
            <h3 className="text-3xl font-bold text-theme-text-primary">{dashboardStats.todayOrders}</h3>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="group bg-theme-bg-primary rounded-3xl p-6 border border-theme-border-primary shadow-sm hover:shadow-xl hover:border-theme-accent-primary/30 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-theme-accent-primary/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-theme-accent-primary/10 text-theme-accent-primary flex items-center justify-center text-xl mb-6"><FaUtensils /></div>
            <p className="text-theme-text-secondary text-sm font-semibold uppercase tracking-wider mb-1">Active Menu Items</p>
            <h3 className="text-3xl font-bold text-theme-text-primary">{dashboardStats.menuItems}</h3>
          </motion.div>
        </div>

        {/* Content Section: Orders & Popular Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-theme-bg-primary border border-theme-border-primary rounded-3xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-theme-text-primary flex items-center gap-2"><FaClock className="text-theme-accent-primary" /> Recent Orders</h2>
              <button className="text-theme-accent-primary hover:text-theme-accent-primary/80 font-semibold text-sm flex items-center gap-1 group">View All <FaChevronRight className="text-xs transition-transform group-hover:translate-x-1" /></button>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3 flex-1">
              {recentOrders.length > 0 ? recentOrders.map((order) => (
                <motion.div variants={itemVariants} key={order.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-theme-bg-secondary hover:bg-theme-bg-hover border border-transparent hover:border-theme-border-primary transition-all duration-300 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1"><h4 className="text-theme-text-primary font-bold text-lg">#{order.orderNumber}</h4><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(order.status)}`}>{order.status}</span></div>
                    <p className="text-theme-text-secondary text-sm font-medium">Table {order.table} • {order.items.join(', ')}</p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                    <p className="text-theme-text-primary font-bold text-lg">₹{order.total.toLocaleString('en-IN')}</p>
                    <p className="text-theme-text-tertiary text-xs font-semibold">{order.time}</p>
                  </div>
                </motion.div>
              )) : (
                <div className="flex flex-col items-center justify-center h-48 text-center bg-theme-bg-secondary/50 rounded-2xl border border-dashed border-theme-border-primary"><FaShoppingCart className="text-4xl text-theme-text-tertiary mb-3 opacity-50" /><p className="text-theme-text-secondary font-medium">No orders yet today</p></div>
              )}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-theme-bg-primary border border-theme-border-primary rounded-3xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-theme-text-primary flex items-center gap-2"><FaFire className="text-orange-500" /> Trending Items</h2>
              <button className="text-theme-accent-primary hover:text-theme-accent-primary/80 font-semibold text-sm flex items-center gap-1 group">Menu <FaChevronRight className="text-xs transition-transform group-hover:translate-x-1" /></button>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 flex-1">
              {popularItems.length > 0 ? popularItems.map((item, index) => {
                const rankStyles = ['bg-yellow-500/10 text-yellow-600 border-yellow-500/20', 'bg-slate-400/10 text-slate-500 border-slate-400/20', 'bg-amber-600/10 text-amber-700 border-amber-600/20'];
                const currentRankStyle = index < 3 ? rankStyles[index] : 'bg-theme-bg-secondary text-theme-text-secondary border-theme-border-primary';
                return (
                  <motion.div variants={itemVariants} key={item.name} className="flex items-center justify-between group p-3 -mx-3 rounded-xl hover:bg-theme-bg-hover transition-colors">
                    <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${currentRankStyle}`}>#{index + 1}</div><div><h4 className="text-theme-text-primary font-bold">{item.name}</h4><p className="text-theme-text-secondary text-sm font-medium">{item.orders} orders</p></div></div>
                    <p className="text-theme-text-primary font-bold">₹{item.revenue.toLocaleString('en-IN')}</p>
                  </motion.div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-48 text-center bg-theme-bg-secondary/50 rounded-2xl border border-dashed border-theme-border-primary"><FaUtensils className="text-4xl text-theme-text-tertiary mb-3 opacity-50" /><p className="text-theme-text-secondary font-medium">Not enough data to show trends</p></div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* NEW: Confirmation Modal Overlay */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-bg-primary/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-theme-bg-primary border border-theme-border-primary shadow-2xl rounded-3xl p-6 w-full max-w-md overflow-hidden relative"
            >
              {/* Modal Header/Icon */}
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-theme-bg-secondary">
                {shopStatus ? (
                  <FaExclamationTriangle className="text-2xl text-status-error" />
                ) : (
                  <FaStore className="text-2xl text-status-success" />
                )}
              </div>
              
              <h3 className="text-2xl font-fredoka text-center text-theme-text-primary mb-2">
                {shopStatus ? 'Close the Shop?' : 'Open the Shop?'}
              </h3>
              
              <p className="text-center text-theme-text-secondary font-medium mb-8">
                {shopStatus 
                  ? "Are you sure you want to close the shop? Your menu will be hidden and you won't receive new orders." 
                  : "Are you sure you want to open the shop? Customers will be able to see your menu and place orders immediately."}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-theme-text-secondary bg-theme-bg-secondary hover:bg-theme-bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmShopStatusToggle}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md transition-all duration-300 ${
                    shopStatus 
                      ? 'bg-status-error hover:bg-red-600 shadow-status-error/30' 
                      : 'bg-status-success hover:bg-green-600 shadow-status-success/30'
                  }`}
                >
                  {shopStatus ? 'Yes, Close It' : 'Yes, Open It'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ZoneShopLayout>
  );
};

export default ZoneShopDashboard;