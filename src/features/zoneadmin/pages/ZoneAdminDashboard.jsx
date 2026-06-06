import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useGetLiveOrdersQuery } from '../../../store/api/ordersApi';
import ApiService from '../../../shared/api/ApiService';
import {
  FaRupeeSign,
  FaStore,
  FaShoppingCart,
  FaClock,
  FaUtensils,
  FaTimes,
  FaCheckCircle,
  FaLayerGroup,
  FaArrowRight,
  FaUsers,
  FaCalendarAlt,
  FaMapMarkerAlt
} from 'react-icons/fa';
import ZoneAdminLayout from './ZoneAdminLayout';
import { usePlanRestrictions } from '../../subscription/components/PlanRestrictions';
import { ErrorState } from '../../../components/common/StateShells';

const ZoneAdminDashboard = () => {
  const { zoneId } = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.ui.auth);
  const [zoneShops, setZoneShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const navigate = useNavigate();

  // Use RTK Query to fetch live orders
  const { 
    data: ordersData, 
    isLoading: ordersLoading, 
    error: ordersError 
  } = useGetLiveOrdersQuery({
    role: 'zone_admin',
    entityId: zoneId
  });
  
  // Ensure orders is always an array with proper fallback
  const orders = Array.isArray(ordersData) ? ordersData : [];
  
  // Fetch zone shops from the database
  useEffect(() => {
    const fetchZoneShops = async () => {
      if (!zoneId) return;

      try {
        setShopsLoading(true);
        const result = await ApiService.getZoneShops(zoneId);
        setZoneShops(result.shops || []);
      } catch (error) {
        setZoneShops([]);
      } finally {
        setShopsLoading(false);
      }
    };

    fetchZoneShops();
  }, [zoneId]);

  // Status color styling function
  const getStatusStyle = (status) => {
    const styles = {
      preparing: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40 shadow-yellow-500/20 shadow-lg',
      ready: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40 shadow-green-500/20 shadow-lg',
      completed: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40 shadow-blue-500/20 shadow-lg',
      active: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/40 shadow-green-500/20 shadow-lg',
      pending: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/40 shadow-orange-500/20 shadow-lg',
      inactive: 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/40',
      default: 'bg-theme-bg-tertiary text-theme-text-secondary border-theme-border'
    };
    return styles[status] || styles.default;
  };

  // Process real data for dashboard stats - ONLY ZONE MERGED ORDERS (ZN format)
  const dashboardStats = useMemo(() => {
    if (!Array.isArray(orders)) {
      return {
        todayRevenue: 0,
        totalOrders: 0,
        totalRevenue: 0,
        todayOrders: 0,
        totalShops: zoneShops.length || 0,
        activeShops: 0
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // All zone orders (single-shop per order; filter by presence of zoneId)
    const zoneMainOrders = orders.filter(order => !!order.zoneId);

    const todayZoneOrders = zoneMainOrders.filter(order => {
      const orderDate = new Date(order.createdAt || order.orderTime);
      return orderDate >= today;
    });

    const todayRevenue = todayZoneOrders.reduce((sum, order) => {
      const orderTotal = order.total || order.pricing?.total || 0;
      return sum + (typeof orderTotal === 'number' ? orderTotal : 0);
    }, 0);

    const totalRevenue = zoneMainOrders.reduce((sum, order) => {
      const orderTotal = order.total || order.pricing?.total || 0;
      return sum + (typeof orderTotal === 'number' ? orderTotal : 0);
    }, 0);

    // Calculate actual shop counts from database
    const totalShops = zoneShops.length || 0;
    const activeShops = zoneShops.filter(shop => {
      return shop.status === 'active' || shop.status === true;
    }).length || 0;

    return {
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      totalOrders: zoneMainOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      todayOrders: todayZoneOrders.length,
      totalShops,
      activeShops
    };
  }, [orders, zoneShops]);

  // Process recent orders - ONLY ZONE MERGED ORDERS (ZN format)
  const recentOrders = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    const zoneMergedOrders = orders.filter(order => !!order.zoneId);

    const sortedOrders = [...zoneMergedOrders]
      .sort((a, b) => new Date(b.createdAt || b.orderTime) - new Date(a.createdAt || a.orderTime))
      .slice(0, 5);

    const processedOrders = sortedOrders.map(order => {
      const orderTime = new Date(order.createdAt || order.orderTime || Date.now());
      
      // Format date and time properly
      const formatDateTime = (date) => {
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        // For older orders, show actual date
        return date.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const shopInfo = order.shopId?.name || order.shopName || 'Zone Order';

      return {
        id: order.orderNumber || order.id || order._id || '#000',
        customerName: order.customerName || order.customer?.name || 'Unknown Customer',
        vendor: shopInfo,
        table: order.tableNumber || '1',
        total: (order.total || order.pricing?.total || 0).toLocaleString('en-IN'),
        status: order.status || 'pending',
        items: Array.isArray(order.items) ? order.items.map(item => item.name || 'Unknown Item') : ['No items'],
        time: formatDateTime(orderTime),
        dateTime: orderTime,
        rawOrder: order,
        orderType: 'zone_merged'
      };
    });

    return processedOrders;
  }, [orders]);

  // Get zone shops with enhanced details
  const shops = useMemo(() => {
    if (!Array.isArray(zoneShops) || zoneShops.length === 0) {
      return [];
    }

    // Remove duplicates and ensure unique shops
    const uniqueZoneShops = zoneShops.filter((shop, index, self) => {
      const shopId = shop._id || shop.id;
      return index === self.findIndex(s => (s._id || s.id) === shopId);
    });

    const shopsWithDetails = uniqueZoneShops.map(shop => {
      const shopId = shop._id || shop.id;
      const shopName = shop.name || `Shop ${shopId?.slice(-4)}`;
      
      // Extract owner information properly
      let ownerName = 'Not provided';
      let ownerPhone = 'Not provided';
      let ownerEmail = 'Not provided';
      
      // Try to get owner info from ownerId (populated data)
      if (shop.ownerId) {
        if (typeof shop.ownerId === 'object') {
          ownerName = shop.ownerId.profile?.name || shop.ownerId.name || 'Not provided';
          ownerPhone = shop.ownerId.phone || 'Not provided';
          ownerEmail = shop.ownerId.email || 'Not provided';
        } else {
          // ownerId is just an ID string
          ownerName = shop.ownerName || 'Not provided';
          ownerPhone = shop.ownerPhone || shop.contactInfo?.phone || 'Not provided';
          ownerEmail = shop.ownerEmail || shop.contactInfo?.email || 'Not provided';
        }
      } else {
        // Fallback to direct shop properties
        ownerName = shop.ownerName || shop.owner || 'Not provided';
        ownerPhone = shop.ownerPhone || shop.contactInfo?.phone || shop.phone || 'Not provided';
        ownerEmail = shop.ownerEmail || shop.contactInfo?.email || shop.email || 'Not provided';
      }
      
      return {
        id: shopId,
        name: shopName,
        cuisine: shop.category || shop.cuisine || 'Food Zone',
        owner: ownerName,
        phone: ownerPhone,
        email: ownerEmail,
        status: shop.status === 'active' || shop.status === true ? 'active' : 'inactive',
        address: shop.address || 'Not provided',
        rating: shop.rating || 0,
        joinedDate: shop.createdAt ? new Date(shop.createdAt) : new Date(),
        description: shop.description || 'No description available',
        operatingHours: shop.operatingHours || 'Not specified',
        shopData: shop,
        // Status indicators
        isActive: shop.status === 'active' || shop.status === true,
        isVerified: shop.isVerified || false,
        isPremium: shop.isPremium || false
      };
    });

    return shopsWithDetails;
  }, [zoneShops]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Handle order details modal
  const handleOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
  };

  const closeOrderDetailModal = () => {
    setShowOrderDetailModal(false);
    setSelectedOrder(null);
  };

  if (ordersLoading || shopsLoading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-secondary font-raleway">
              Loading zone dashboard{shopsLoading ? ' and shop data' : ''}...
            </p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  if (ordersError) {
    return (
      <ZoneAdminLayout>
        <ErrorState
          error={ordersError?.data?.message || ordersError?.message || 'Could not load live orders.'}
          onRetry={() => window.location.reload()}
        />
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="w-full max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Simple Header */}
          <div>
            <h1 className="text-2xl font-fredoka text-theme-text-primary">Zone Dashboard</h1>
          </div>

          {/* Compact Stats Cards - Single Row Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card rounded-xl p-4 shadow-lg border border-theme-border"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-status-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaRupeeSign className="text-status-success text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-raleway font-bold text-theme-text-primary truncate">
                    ₹{dashboardStats.todayRevenue.toLocaleString('en-IN')}
                  </h3>
                  <p className="text-theme-text-secondary font-raleway text-xs">Today's Revenue</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="admin-card rounded-xl p-4 shadow-lg border border-theme-border"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-status-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaStore className="text-status-info text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-raleway font-bold text-theme-text-primary">{dashboardStats.totalShops}</h3>
                  <p className="text-theme-text-secondary font-raleway text-xs">Total Shops</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="admin-card rounded-xl p-4 shadow-lg border border-theme-border"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-status-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaShoppingCart className="text-status-warning text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-raleway font-bold text-theme-text-primary">{dashboardStats.todayOrders}</h3>
                  <p className="text-theme-text-secondary font-raleway text-xs">Today's Orders</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="admin-card rounded-xl p-4 shadow-lg border border-theme-border"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-theme-accent-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FaRupeeSign className="text-theme-accent-primary text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-raleway font-bold text-theme-text-primary truncate">
                    ₹{dashboardStats.totalRevenue.toLocaleString('en-IN')}
                  </h3>
                  <p className="text-theme-text-secondary font-raleway text-xs">Total Revenue</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Content Grid - Shops Left, Orders Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vendor Details - LEFT SIDE */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="admin-card rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-fredoka text-theme-text-primary">Vendor Shops</h2>
                  <p className="text-sm text-theme-text-secondary font-raleway mt-1">
                    {shopsLoading ? 'Loading...' : `${shops.length} total • ${shops.filter(s => s.status === 'active').length} active`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-status-info/10 rounded-lg flex items-center justify-center">
                  <FaStore className="text-status-info text-xl" />
                </div>
              </div>

              <div className="space-y-3">
                {shops.length > 0 ? shops.map((shop) => (
                  <div 
                    key={shop.id} 
                    className="bg-theme-bg-secondary rounded-xl p-4 border border-theme-border"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="w-14 h-14 bg-gradient-to-br from-theme-accent-primary to-theme-accent-secondary rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                          <FaUtensils className="text-white text-xl" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-theme-text-primary font-raleway font-bold text-lg truncate">
                            {shop.name}
                          </h4>
                          <p className="text-theme-text-secondary font-raleway text-sm">
                            {shop.cuisine}
                          </p>
                          <p className="text-theme-text-tertiary font-mono text-xs mt-1">
                            #{shop.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2 ml-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-raleway font-semibold ${getStatusColor(shop.status)}`}>
                          {shop.status}
                        </span>
                        {shop.isVerified && (
                          <FaCheckCircle className="text-status-success text-base" title="Verified Shop" />
                        )}
                      </div>
                    </div>
                    
                    {/* Shop Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-theme-border">
                      <div>
                        <p className="text-xs text-theme-text-tertiary font-raleway mb-1 flex items-center">
                          <FaUsers className="mr-1" /> Owner
                        </p>
                        <p className="text-sm text-theme-text-primary font-raleway font-medium truncate">{shop.owner}</p>
                      </div>
                      <div>
                        <p className="text-xs text-theme-text-tertiary font-raleway mb-1">Phone</p>
                        <p className="text-sm text-theme-text-primary font-raleway font-medium">{shop.phone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-theme-text-tertiary font-raleway mb-1">Joined</p>
                        <p className="text-sm text-theme-text-primary font-raleway flex items-center">
                          <FaCalendarAlt className="mr-2 text-theme-text-tertiary" />
                          {shop.joinedDate.toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-theme-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaStore className="text-4xl text-theme-text-tertiary" />
                    </div>
                    <div className="space-y-2">
                      {shopsLoading ? (
                        <>
                          <div className="w-10 h-10 border-3 border-theme-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-theme-text-secondary font-raleway font-medium">Loading vendors...</p>
                        </>
                      ) : (
                        <>
                          <p className="text-theme-text-primary font-raleway font-bold text-lg">No Shops Found</p>
                          <p className="text-theme-text-secondary font-raleway text-sm">
                            Add shops to this zone to get started
                          </p>
                          <div className="mt-6">
                            <button 
                              onClick={() => navigate(`/zone/${zoneId}/vendors/list`)}
                              className="px-6 py-3 bg-theme-accent-primary hover:bg-theme-accent-primary/90 text-white rounded-lg font-raleway font-semibold transition-all hover:shadow-lg"
                            >
                              Add Vendors
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Orders - RIGHT SIDE */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="admin-card rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-fredoka text-theme-text-primary">Recent Orders</h2>
                  <p className="text-sm text-theme-text-secondary font-raleway mt-1">
                    Zone merged orders
                  </p>
                </div>
                <div className="w-12 h-12 bg-status-warning/10 rounded-lg flex items-center justify-center">
                  <FaShoppingCart className="text-status-warning text-xl" />
                </div>
              </div>

              <div className="space-y-3">
                {recentOrders.length > 0 ? recentOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="bg-theme-bg-secondary rounded-xl p-4 cursor-pointer border border-theme-border transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                    onClick={() => handleOrderDetails(order)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-theme-text-primary font-raleway font-bold text-lg truncate">{order.customerName}</h4>
                        <p className="text-theme-text-secondary font-raleway text-sm flex items-center mt-1">
                          <FaMapMarkerAlt className="mr-1 text-xs" />
                          {order.vendor} • Table {order.table}
                        </p>
                        <p className="text-theme-text-tertiary font-mono text-xs mt-1">#{order.id}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-theme-text-primary font-fredoka font-bold text-xl">₹{order.total}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-raleway font-semibold mt-2 ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-theme-border">
                      <p className="text-theme-text-secondary font-raleway text-sm truncate flex-1 mr-2">
                        {order.items.slice(0, 2).join(', ')}
                        {order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
                      </p>
                      <div className="flex items-center text-theme-text-tertiary font-raleway text-sm font-medium">
                        <FaClock className="mr-1 text-xs" />
                        {order.time}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-theme-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaShoppingCart className="text-4xl text-theme-text-tertiary" />
                    </div>
                    <p className="text-theme-text-primary font-raleway font-bold text-lg">No Recent Orders</p>
                    <p className="text-theme-text-secondary font-raleway text-sm mt-2">
                      Orders will appear here once customers start ordering
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Order Detail Modal - Professional Bill/Receipt Style */}
          <AnimatePresence>
            {showOrderDetailModal && selectedOrder && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                onClick={(e) => e.target === e.currentTarget && setShowOrderDetailModal(false)}
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="admin-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-theme-border"
                >
                  {/* Decorative Top Edge */}
                  <div className="h-2 bg-theme-accent-primary w-full"></div>
                  
                  <div className="p-8 relative">
                    {/* Close Button */}
                    <button 
                      onClick={() => setShowOrderDetailModal(false)}
                      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-tertiary hover:bg-theme-bg-secondary hover:text-theme-text-primary transition-colors"
                    >
                      <FaTimes size={18} />
                    </button>

                    {/* Bill Header */}
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-fredoka text-theme-text-primary uppercase tracking-widest">Receipt</h2>
                      <div className="flex items-center justify-center space-x-2 mt-2">
                        <span className="h-px w-8 bg-theme-border"></span>
                        <p className="text-theme-text-secondary font-raleway text-sm font-bold font-mono">
                          {selectedOrder.orderNumber}
                        </p>
                        <span className="h-px w-8 bg-theme-border"></span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-y-3 mb-6 text-sm border-b border-theme-border pb-6">
                      <div>
                        <p className="text-theme-text-tertiary font-raleway uppercase text-[10px] tracking-wider font-bold">Customer</p>
                        <p className="text-theme-text-primary font-raleway font-bold">{selectedOrder.customerName || 'Guest'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-theme-text-tertiary font-raleway uppercase text-[10px] tracking-wider font-bold">Table</p>
                        <p className="text-theme-text-primary font-raleway font-bold">Table {selectedOrder.table || selectedOrder.rawOrder?.tableNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-theme-text-tertiary font-raleway uppercase text-[10px] tracking-wider font-bold">Date</p>
                        <p className="text-theme-text-primary font-raleway font-medium">
                          {selectedOrder.dateTime ? new Date(selectedOrder.dateTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-theme-text-tertiary font-raleway uppercase text-[10px] tracking-wider font-bold">Time</p>
                        <p className="text-theme-text-primary font-raleway font-medium">
                          {selectedOrder.dateTime ? new Date(selectedOrder.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge - Floating style */}
                    <div className="flex justify-center mb-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-widest border ${getStatusStyle(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-3 mb-8">
                      {/* Header */}
                      <div className="flex justify-between items-center border-b border-theme-border pb-2">
                        <span className="text-[10px] uppercase font-bold text-theme-text-tertiary tracking-widest font-raleway">Item</span>
                        <span className="text-[10px] uppercase font-bold text-theme-text-tertiary tracking-widest font-raleway">Price</span>
                      </div>
                      
                      {/* Items */}
                      {selectedOrder.rawOrder?.items && selectedOrder.rawOrder.items.length > 0 ? (
                        selectedOrder.rawOrder.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-theme-text-primary font-raleway font-bold text-sm leading-tight">
                                {item.quantity || 1}x {item.name || 'Unknown Item'}
                              </h4>
                              {item.customization && item.customization.length > 0 && (
                                <p className="text-theme-text-tertiary font-raleway text-[11px] italic mt-0.5">
                                  + {item.customization.join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="text-theme-text-primary font-raleway font-bold text-sm ml-4">
                              ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-theme-text-tertiary text-sm">
                          No items available
                        </div>
                      )}
                    </div>

                    {/* Calculation Summary */}
                    <div className="space-y-2 pt-4 border-t-2 border-dotted border-theme-border">
                      <div className="flex justify-between text-theme-text-secondary font-raleway text-sm">
                        <span>Subtotal</span>
                        <span>₹{(selectedOrder.rawOrder?.total || selectedOrder.rawOrder?.pricing?.total || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 mt-2 border-t border-theme-border">
                        <span className="text-theme-text-primary font-fredoka text-xl uppercase tracking-tight">Amount</span>
                        <span className="text-theme-accent-primary font-fredoka text-3xl">₹{(selectedOrder.rawOrder?.total || selectedOrder.rawOrder?.pricing?.total || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Footer info */}
                    <div className="mt-10 text-center space-y-4">
                      <div className="flex items-center justify-center text-theme-text-tertiary text-xs font-raleway space-x-2">
                        <FaStore />
                        <span>Zone Order</span>
                      </div>
                      <p className="text-[10px] text-theme-text-tertiary font-raleway uppercase tracking-[0.2em] font-bold">*** Handled by Zone Admin ***</p>
                      
            
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </ZoneAdminLayout>
  );
};
export default ZoneAdminDashboard;
