import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShoppingCart,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaSearch,
  FaRedo,
  FaMapMarkerAlt,
  FaStore,
  FaUser,
  FaDollarSign,
  FaUtensils,
  FaPhone,
  FaBell,
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { useGetLiveOrdersQuery } from '../../../../store/api/ordersApi';
import SuperAdminLayout from '../SuperAdminLayout';

const LiveOrders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 24;

  // Enhanced Toast Utility Function
  const showToast = (type, title, message, duration = 4000) => {
    if (typeof window === 'undefined') return;
    
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const colors = {
      success: {
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        shadowColor: 'rgba(16, 185, 129, 0.3)',
        icon: `<path d="M20 6L9 17L4 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
      },
      info: {
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        shadowColor: 'rgba(59, 130, 246, 0.3)',
        icon: `<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      }
    };
    
    const config = colors[type] || colors.success;
    
    const toastContainer = document.createElement('div');
    toastContainer.innerHTML = `
      <div id="${toastId}" style="
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${config.gradient};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 25px ${config.shadowColor}, 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 500;
        font-size: 14px;
        min-width: 320px;
        max-width: 450px;
        transform: translateX(500px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 12px;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <div style="
            width: 24px;
            height: 24px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              ${config.icon}
            </svg>
          </div>
          <div style="flex: 1;">
            <div style="
              font-weight: 600;
              margin-bottom: 2px;
              font-size: 14px;
            ">${title}</div>
            <div style="
              font-weight: 400;
              opacity: 0.9;
              font-size: 12px;
            ">${message}</div>
          </div>
          <button onclick="document.getElementById('${toastId}').style.transform='translateX(500px)'; document.getElementById('${toastId}').style.opacity='0'; setTimeout(() => this.parentElement.parentElement.parentElement.remove(), 400);" style="
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            opacity: 0.7;
            transition: opacity 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // Position toast below existing toasts
    const existingToasts = document.querySelectorAll('[id^="toast-"]');
    const topOffset = 24 + (existingToasts.length * 80);
    const toast = toastContainer.querySelector(`#${toastId}`);
    if (toast) {
      toast.style.top = `${topOffset}px`;
    }
    
    document.body.appendChild(toastContainer);
    
    // Animate toast in
    setTimeout(() => {
      const toastElement = document.getElementById(toastId);
      if (toastElement) {
        toastElement.style.transform = 'translateX(0)';
      }
    }, 100);
    
    // Auto-remove toast
    setTimeout(() => {
      const toastElement = document.getElementById(toastId);
      if (toastElement) {
        toastElement.style.transform = 'translateX(500px)';
        toastElement.style.opacity = '0';
        setTimeout(() => {
          if (toastContainer.parentNode) {
            toastContainer.parentNode.removeChild(toastContainer);
          }
        }, 400);
      }
    }, duration);
  };

  // Get user role for admin access
  const { user } = useSelector((state) => state.ui.auth);
  
  // Fetch real orders from database for admin
  const { 
    data: ordersData, 
    isLoading: loading, 
    error: ordersError,
    refetch 
  } = useGetLiveOrdersQuery({
    role: 'admin',
    entityId: null,
    limit: 100000
  }, {
    pollingInterval: 0,
    refetchOnMountOrArgChange: true
  });

  // Set up real-time notifications for new orders (Admin)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const handleNewOrder = (orderData) => {
      console.log('🔔 New order received for admin dashboard:', orderData);
      
      // Show notification for all new orders (admin sees everything)
      const businessType = orderData.restaurantId ? 'Restaurant' : 'Zone';
      const businessName = orderData.restaurantName || orderData.zoneName || 'Business';
      
      showToast('info', 'New Order Alert!', `${businessType}: ${businessName} - Order #${orderData.orderNumber}`);
      
      // Play notification sound (optional)
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.3; // Lower volume for admin
        audio.play().catch(e => console.log('Could not play notification sound:', e));
      } catch (e) {
        console.log('Notification sound not available');
      }
      
      // Refresh orders to show the new order
      refetch();
    };

    // Import RealTimeService dynamically to avoid circular dependencies
    import('../../../../services/RealTimeService').then(({ default: RealTimeService }) => {
      // Listen for new orders
      RealTimeService.addEventListener('new_order', handleNewOrder);
      
      // Join admin room to receive all notifications
      RealTimeService.joinRoom('admin', 'dashboard');
      
      console.log('🔔 Admin notification system initialized');
    });

    // Cleanup
    return () => {
      import('../../../../services/RealTimeService').then(({ default: RealTimeService }) => {
        RealTimeService.removeEventListener('new_order', handleNewOrder);
        RealTimeService.leaveRoom('admin', 'dashboard');
      });
    };
  }, [user, refetch]);
  
  // Transform data from API response
  const orders = Array.isArray(ordersData) ? ordersData
    .filter(order => {
      return order.restaurantId || order.zoneId || order.orderNumber || (order.items && order.items.length > 0);
    })
    .map(order => {
    let restaurantName = 'Unknown Restaurant';
    let restaurantType = 'Single Restaurant';
    
    if (order.restaurantId?.name) {
      restaurantName = order.restaurantId.name;
      restaurantType = 'Single Restaurant';
    } else if (order.zoneId?.name) {
      restaurantName = order.zoneId.name;
      restaurantType = 'Zone';
      if (order.shopId?.name || order.shopName) {
        const shopName = order.shopId?.name || order.shopName;
        restaurantName = `${order.zoneId.name} - ${shopName}`;
        restaurantType = 'Zone Shop';
      }
    } else if (order.zoneName) {
      restaurantName = order.zoneName;
      restaurantType = 'Zone';
      if (order.shopName) {
        restaurantName = `${order.zoneName} - ${order.shopName}`;
        restaurantType = 'Zone Shop';
      }
    }
    
    return {
      id: order.orderNumber || order._id,
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || 'Unknown Customer',
      customerPhone: order.customer?.phone || 'N/A',
      restaurant: restaurantName,
      restaurantType: restaurantType,
      zone: order.zoneId?.name || order.zoneName,
      tableNumber: order.tableNumber || 'N/A',
      items: order.items || [],
      total: order.pricing?.total || order.total || 0,
      status: order.status || 'pending',
      orderTime: order.createdAt || new Date().toISOString()
    };
  }) : [];

  // Debug logging
  useEffect(() => {
    console.log('🔍 Admin Live Orders Debug:', {
      userRole: user?.role,
      ordersData,
      ordersCount: orders.length,
      loading,
      ordersError: ordersError ? {
        status: ordersError.status,
        data: ordersError.data, // Fixed syntax error
        message: ordersError.message
      } : null
    });
  }, [user, ordersData, orders, loading, ordersError]);

  // Handle manual refresh
  const handleRefresh = () => {
    refetch();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'status-info bg-status-info-light text-status-info';
      case 'preparing': return 'status-warning bg-status-warning-light text-status-warning';
      case 'ready': return 'status-success bg-status-success-light text-status-success';
      case 'delivered': return 'status-success bg-status-success-light text-status-success';
      case 'completed': return 'status-success bg-status-success-light text-status-success';
      case 'cancelled': return 'status-error bg-status-error-light text-status-error';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  // Optimized filtering with memoization
  const filteredOrders = React.useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return orders.filter(order => {
      const matchesSearch = (order.id || '').toLowerCase().includes(lowerSearchTerm) ||
        (order.orderNumber || '').toLowerCase().includes(lowerSearchTerm) ||
        (order.customerName || '').toLowerCase().includes(lowerSearchTerm) ||
        (order.restaurant || '').toLowerCase().includes(lowerSearchTerm);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Optimized sorting
  const sortedOrders = React.useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.orderTime) - new Date(a.orderTime);
      } else if (sortBy === 'oldest') {
        return new Date(a.orderTime) - new Date(b.orderTime);
      } else if (sortBy === 'highest') {
        return b.total - a.total;
      } else if (sortBy === 'lowest') {
        return a.total - b.total;
      }
      return 0;
    });
  }, [filteredOrders, sortBy]);

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = sortedOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(sortedOrders.length / ordersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSinceOrder = (timestamp) => {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffMinutes = Math.floor((now - orderTime) / (1000 * 60));
    return `${diffMinutes} mins ago`;
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway text-xl">Loading live orders...</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  // Show error state if API call failed
  if (ordersError) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <FaExclamationTriangle className="text-6xl text-theme-accent-error mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">Error Loading Orders</h3>
            <p className="text-theme-text-secondary font-raleway mb-4">
              {ordersError?.data?.message || ordersError?.message || 'Failed to load orders from database'}
            </p>
            <button
              onClick={handleRefresh}
              className="btn-primary px-8 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2 mx-auto"
            >
              <FaRedo className="animate-spin" /> 
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-fredoka text-theme-text-primary mb-1">Live Orders Dashboard</h1>
            <p className="text-theme-text-secondary font-raleway text-sm md:text-base">Real-time order monitoring across all restaurants and zones</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="btn-primary px-4 py-2 rounded-lg font-raleway font-semibold flex items-center space-x-2"
            >
              <FaRedo />
              <span>Refresh</span>
            </button>
            
          </div>
        </div>
 <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="admin-card rounded-2xl p-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search orders, customers, restaurants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full input-theme rounded-lg pl-10 pr-4 py-2 focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-theme rounded-lg px-4 py-2 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-theme rounded-lg px-4 py-2 focus:outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Amount</option>
                  <option value="lowest">Lowest Amount</option>
                </select>
              </div>
            </motion.div>
       

        {/* Order Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="admin-card rounded-2xl p-5 bg-secondary border ">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-secondary rounded-xl border border-secondary flex items-center  justify-center">
                <FaShoppingCart className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Total Orders</p>
                <p className="text-theme-text-primary font-fredoka text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </div>
          <div className="admin-card rounded-2xl p-5 bg-secondary border ">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-secondary rounded-xl border border-secondary flex items-center justify-center">
                <FaClock className="text-amber-600 text-xl" />
              </div>
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Active Orders</p>
                <p className="text-theme-text-primary font-fredoka text-2xl font-bold">
                  {orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="admin-card rounded-2xl p-5 bg-secondary border ">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-secondary rounded-xl border border-secondary flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Completed</p>
                <p className="text-theme-text-primary font-fredoka text-2xl font-bold">
                  {orders.filter(o => ['delivered', 'completed'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="admin-card rounded-2xl p-5 bg-secondary border ">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-secondary rounded-xl border border-secondary flex items-center justify-center">
                <FaDollarSign className="text-purple-600 text-xl" />
              </div>
              <div>
                <p className="text-theme-text-tertiary font-raleway text-sm">Total Revenue</p>
                <p className="text-theme-text-primary font-fredoka text-2xl font-bold">
                  ₹{orders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="admin-card rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <h2 className="text-xl font-fredoka text-theme-text-primary">Recent Orders</h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-theme-text-secondary font-raleway">
                Showing {indexOfFirstOrder + 1}-{Math.min(indexOfLastOrder, sortedOrders.length)} of {sortedOrders.length} orders
              </div>
              
            </div>
          </div>

          {currentOrders.length === 0 ? (
            <div className="text-center py-12">
              <FaShoppingCart className="text-6xl text-theme-text-tertiary mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">
                {orders.length === 0 ? 'No Orders Available' : 'No Orders Found'}
              </h3>
              <p className="text-theme-text-secondary font-raleway max-w-md mx-auto">
                {orders.length === 0 
                  ? 'No orders have been placed yet. Orders will appear here once customers start placing them.'
                  : 'No orders match your current filters. Try adjusting your search criteria.'
                }
              </p>
              {orders.length === 0 && (
                <button
                  onClick={handleRefresh}
                  className="mt-6 btn-primary px-8 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2 mx-auto"
                >
                  <FaRedo />
                  <span>Refresh Orders</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  className="admin-card rounded-2xl p-5 hover:border-theme-accent-primary/30 transition-all duration-300 cursor-pointer border border-theme-border-primary shadow-sm hover:shadow-md"
                  onClick={() => setSelectedOrder(order)}
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-fredoka text-theme-text-primary">#{order.orderNumber || order.id}</h3>
                        {order.isMergedOrder && (
                          <span className="px-2 py-1 rounded-full text-xs font-raleway bg-blue-100 text-blue-700">
                            ZONE ORDER
                          </span>
                        )}
                      </div>
                      <p className="text-theme-text-secondary font-raleway text-sm">{getTimeSinceOrder(order.orderTime)}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`px-3 py-1 rounded-full text-xs font-raleway ${getStatusColor(order.status)} font-semibold`}>
                        {order.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <FaUser className="text-theme-text-tertiary w-4 h-4" />
                      <span className="text-theme-text-primary font-raleway truncate max-w-[180px]">{order.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaPhone className="text-theme-text-tertiary w-4 h-4" />
                      <span className="text-theme-text-secondary font-raleway text-sm">{order.customerPhone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaMapMarkerAlt className="text-theme-text-tertiary w-4 h-4" />
                      <span className="text-theme-text-secondary font-raleway text-sm">Table {order.tableNumber}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaStore className="text-theme-text-tertiary w-4 h-4" />
                      <span className="text-theme-text-secondary font-raleway text-sm truncate max-w-[180px]">{order.restaurant}</span>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="flex justify-between items-center border-t border-theme-border-primary pt-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-theme-text-secondary font-raleway text-sm">
                        {order.isMergedOrder ? `${order.shopCount || 0} shops` : `${order.items.length} items`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-theme-text-primary font-sans font-bold text-lg">₹{(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <button 
                    className="w-full mt-4 text-center text-theme-accent-primary font-raleway text-sm flex items-center justify-center space-x-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedOrder(expandedOrder === order.id ? null : order.id);
                    }}
                  >
                    <span>{expandedOrder === order.id ? 'Show Less' : 'View Details'}</span>
                    {expandedOrder === order.id ? <FaChevronUp /> : <FaChevronDown />}
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedOrder === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="mt-4 pt-4 border-t border-theme-border-primary overflow-hidden"
                      >
                        <h4 className="font-fredoka text-theme-text-primary mb-2">Order Items</h4>
                        <div className="max-h-40 overflow-y-auto pr-2">
                          {order.items.length > 0 ? (
                            <ul className="space-y-2">
                              {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between text-sm">
                                  <span className="text-theme-text-secondary font-raleway">
                                    {item.quantity}x {item.name || item.itemName || 'Unknown Item'}
                                  </span>
                                  <span className="text-theme-text-primary font-raleway">
                                    ₹{((item.price || 0) * (item.quantity || 1)).toFixed(0)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-theme-text-tertiary text-sm italic">No items found</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {sortedOrders.length > ordersPerPage && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                disabled={currentPage === 1}
                className={`p-3 rounded-lg flex items-center ${currentPage === 1 ? 'bg-theme-bg-secondary text-theme-text-tertiary cursor-not-allowed' : 'btn-secondary'}`}
              >
                <FaChevronLeft className="mr-1" /> Previous
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => paginate(pageNum)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      currentPage === pageNum 
                        ? 'bg-theme-accent-primary text-white' 
                        : 'btn-secondary'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                disabled={currentPage === totalPages}
                className={`p-3 rounded-lg flex items-center ${currentPage === totalPages ? 'bg-theme-bg-secondary text-theme-text-tertiary cursor-not-allowed' : 'btn-secondary'}`}
              >
                Next <FaChevronRight className="ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-fredoka text-theme-text-primary">Order Details</h2>
                    <p className="text-theme-text-secondary font-raleway"># {selectedOrder.orderNumber || selectedOrder.id}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="text-theme-text-tertiary hover:text-theme-text-primary text-2xl"
                  >
                    &times;
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <FaUser className="text-theme-text-tertiary w-5 h-5" />
                      <div>
                        <p className="text-theme-text-secondary text-sm">Customer</p>
                        <p className="font-raleway">{selectedOrder.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FaPhone className="text-theme-text-tertiary w-5 h-5" />
                      <div>
                        <p className="text-theme-text-secondary text-sm">Phone</p>
                        <p className="font-raleway">{selectedOrder.customerPhone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FaMapMarkerAlt className="text-theme-text-tertiary w-5 h-5" />
                      <div>
                        <p className="text-theme-text-secondary text-sm">Table</p>
                        <p className="font-raleway">Table {selectedOrder.tableNumber}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <FaStore className="text-theme-text-tertiary w-5 h-5" />
                      <div>
                        <p className="text-theme-text-secondary text-sm">Restaurant</p>
                        <p className="font-raleway">{selectedOrder.restaurant}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FaClock className="text-theme-text-tertiary w-5 h-5" />
                      <div>
                        <p className="text-theme-text-secondary text-sm">Order Time</p>
                        <p className="font-raleway">{new Date(selectedOrder.orderTime).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FaShoppingCart className="text-theme-text-tertiary w-5 h-5" />
                      <div>
                        <p className="text-theme-text-secondary text-sm">Status</p>
                        <span className={`px-3 py-1 rounded-full text-sm font-raleway ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-fredoka text-theme-text-primary mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-theme-bg-secondary rounded-lg">
                          <div>
                            <p className="font-raleway font-semibold">{item.name || item.itemName || 'Unknown Item'}</p>
                            <p className="text-theme-text-secondary text-sm">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-raleway font-semibold">₹{((item.price || 0) * (item.quantity || 1)).toFixed(0)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-theme-text-tertiary italic">No items in this order</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-theme-border-primary">
                  <div>
                    <p className="text-theme-text-secondary">Total Amount</p>
                    <p className="text-2xl font-fredoka font-bold text-theme-text-primary">₹{selectedOrder.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SuperAdminLayout>
  );
};

export default LiveOrders;