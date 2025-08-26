import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaShoppingCart,
  FaClock,
  FaCheck,
  FaUser,
  FaMapMarkerAlt,
  FaPhone,
  FaEye,
  FaPlay,
  FaPause,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSync,
  FaBell
} from 'react-icons/fa';
import ZoneShopLayout from '../ZoneShopLayout';

const LiveOrders = () => {
  const { zoneId, shopId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get real orders from localStorage
  const getOrders = () => {
    try {
      return JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_shop_${shopId}_orders`) || '[]');
    } catch (error) {
      console.error('Error loading orders:', error);
      return [];
    }
  };

  // Save orders to localStorage
  const saveOrders = (ordersData) => {
    try {
      const { zoneId, shopId } = useParams();
      localStorage.setItem(`tableserve_zone_${zoneId}_shop_${shopId}_orders`, JSON.stringify(ordersData));
      return true;
    } catch (error) {
      console.error('Error saving orders:', error);
      return false;
    }
  };

  useEffect(() => {
    // Load real orders
    const loadOrders = () => {
      setLoading(true);
      const ordersData = getOrders();
      setOrders(ordersData);
      setLoading(false);
    };

    loadOrders();
  }, []);

  // Auto refresh orders
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate real-time updates
      setOrders(prevOrders =>
        prevOrders.map(order => ({
          ...order,
          // Randomly update estimated time for preparing orders
          estimatedTime: order.status === 'preparing'
            ? Math.max(0, order.estimatedTime - 1)
            : order.estimatedTime
        }))
      );
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'preparing': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'ready': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'completed': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return <FaBell className="text-blue-400" />;
      case 'preparing': return <FaClock className="text-yellow-400" />;
      case 'ready': return <FaCheckCircle className="text-green-400" />;
      case 'completed': return <FaCheck className="text-gray-400" />;
      default: return <FaClock className="text-gray-400" />;
    }
  };

  const updateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? {
          ...order,
          status: newStatus,
          estimatedTime: newStatus === 'ready' ? 0 : order.estimatedTime
        }
        : order
    );
    setOrders(updatedOrders);
    saveOrders(updatedOrders);
  };

  const getTimeAgo = (date) => {
    const minutes = Math.floor((new Date() - date) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const ordersByStatus = {
    new: orders.filter(o => o.status === 'new'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready')
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-theme-text-primary text-xl">Loading orders...</div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ZoneShopLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Live Orders</h1>
            <p className="text-theme-text-secondary font-raleway">Manage incoming orders in real-time</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-raleway transition-colors ${autoRefresh
                  ? 'bg-status-success hover:bg-status-success/80 text-theme-text-inverse'
                  : 'admin-card border border-theme-border-primary text-theme-text-primary'
                }`}
            >
              {autoRefresh ? <FaPlay /> : <FaPause />}
              <span>{autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}</span>
            </button>

          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="admin-card rounded-xl p-4">
            <h3 className="text-2xl font-sans text-status-info">{ordersByStatus.new.length}</h3>
            <p className="text-theme-text-secondary font-raleway text-sm">New Orders</p>
          </div>
          <div className="admin-card rounded-xl p-4">
            <h3 className="text-2xl font-sans text-status-warning">{ordersByStatus.preparing.length}</h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Preparing</p>
          </div>
          <div className="admin-card rounded-xl p-4">
            <h3 className="text-2xl font-sans text-status-success">{ordersByStatus.ready.length}</h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Ready</p>
          </div>
          <div className="admin-card rounded-xl p-4">
            <h3 className="text-2xl font-sans text-theme-text-primary">{orders.length}</h3>
            <p className="text-theme-text-secondary font-raleway text-sm">Total Active</p>
          </div>
        </div>

        {/* Orders by Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New Orders */}
          <div className="space-y-4">
            <h2 className="text-lg font-fredoka text-status-info flex items-center space-x-2">
              <FaBell />
              <span>New Orders ({ordersByStatus.new.length})</span>
            </h2>
            {ordersByStatus.new.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="admin-card rounded-xl p-4 border border-status-info/30 cursor-pointer hover:bg-theme-bg-hover transition-colors"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-theme-text-primary font-fredoka">{order.customerName}</h3>
                    <p className="text-theme-text-secondary font-raleway text-sm">Table {order.tableNumber} • {getTimeAgo(order.orderTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-theme-text-primary font-sans">₹{order.total.toLocaleString('en-IN')}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(order.status)}`}>
                      New
                    </span>
                  </div>
                </div>
                <div className="space-y-1 mb-3">
                  {order.items.map((item, index) => (
                    <p key={index} className="text-theme-text-secondary font-raleway text-sm">
                      {item.quantity}x {item.name}
                      {item.notes && <span className="text-status-warning"> ({item.notes})</span>}
                    </p>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOrderStatus(order.id, 'preparing');
                    }}
                    className="flex-1 bg-status-warning hover:bg-status-warning/80 text-theme-text-inverse py-2 px-3 rounded-lg font-raleway text-sm"
                  >
                    Accept & Prepare
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Preparing Orders */}
          <div className="space-y-4">
            <h2 className="text-lg font-fredoka text-status-warning flex items-center space-x-2">
              <FaClock />
              <span>Preparing ({ordersByStatus.preparing.length})</span>
            </h2>
            {ordersByStatus.preparing.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="admin-card rounded-xl p-4 border border-status-warning/30 cursor-pointer hover:bg-theme-bg-hover transition-colors"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-theme-text-primary font-fredoka">{order.customerName}</h3>
                    <p className="text-theme-text-secondary font-raleway text-sm">Table {order.tableNumber} • {getTimeAgo(order.orderTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-theme-text-primary font-sans">₹{order.total.toLocaleString('en-IN')}</p>
                    <p className="text-status-warning font-raleway text-sm">{order.estimatedTime} min left</p>
                  </div>
                </div>
                <div className="space-y-1 mb-3">
                  {order.items.map((item, index) => (
                    <p key={index} className="text-theme-text-secondary font-raleway text-sm">
                      {item.quantity}x {item.name}
                      {item.notes && <span className="text-status-warning"> ({item.notes})</span>}
                    </p>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'ready');
                  }}
                  className="w-full bg-status-success hover:bg-status-success/80 text-theme-text-inverse py-2 px-3 rounded-lg font-raleway text-sm"
                >
                  Mark as Ready
                </button>
              </motion.div>
            ))}
          </div>

          {/* Ready Orders */}
          <div className="space-y-4">
            <h2 className="text-lg font-fredoka text-status-success flex items-center space-x-2">
              <FaCheckCircle />
              <span>Ready for Pickup ({ordersByStatus.ready.length})</span>
            </h2>
            {ordersByStatus.ready.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="admin-card rounded-xl p-4 border border-status-success/30 cursor-pointer hover:bg-theme-bg-hover transition-colors"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-theme-text-primary font-fredoka">{order.customerName}</h3>
                    <p className="text-theme-text-secondary font-raleway text-sm">Table {order.tableNumber} • {getTimeAgo(order.orderTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-theme-text-primary font-sans">₹{order.total.toLocaleString('en-IN')}</p>
                    <span className="text-status-success font-raleway text-sm">Ready!</span>
                  </div>
                </div>
                <div className="space-y-1 mb-3">
                  {order.items.map((item, index) => (
                    <p key={index} className="text-theme-text-secondary font-raleway text-sm">
                      {item.quantity}x {item.name}
                    </p>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'completed');
                  }}
                  className="w-full bg-status-info hover:bg-status-info/80 text-theme-text-inverse py-2 px-3 rounded-lg font-raleway text-sm"
                >
                  Mark as Completed
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Order Details Modal */}
        <AnimatePresence>
          {showOrderDetails && selectedOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && setShowOrderDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-fredoka text-white">Order Details</h2>
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="text-white/60 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-white font-fredoka mb-2">Customer Information</h3>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <FaUser className="text-white/60" />
                            <span className="text-white font-raleway">{selectedOrder.customerName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FaPhone className="text-white/60" />
                            <span className="text-white font-raleway">{selectedOrder.customerPhone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FaMapMarkerAlt className="text-white/60" />
                            <span className="text-white font-raleway">Table {selectedOrder.tableNumber}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-white font-fredoka mb-2">Order Information</h3>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-white/60">Order ID:</span>
                            <span className="text-white font-raleway">{selectedOrder.id}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white/60">Status:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(selectedOrder.status)}`}>
                              {selectedOrder.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white/60">Order Time:</span>
                            <span className="text-white font-raleway">{selectedOrder.orderTime.toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white/60">Payment:</span>
                            <span className="text-green-400 font-raleway">{selectedOrder.paymentStatus}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="text-white font-fredoka mb-4">Order Items</h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-raleway font-medium">{item.name}</h4>
                              <p className="text-white/60 font-raleway text-sm">Quantity: {item.quantity}</p>
                              {item.notes && (
                                <p className="text-yellow-400 font-raleway text-sm">Note: {item.notes}</p>
                              )}
                            </div>
                            <p className="text-white font-fredoka">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-fredoka text-lg">Total:</span>
                        <span className="text-accent font-fredoka text-xl">${selectedOrder.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {selectedOrder.specialInstructions && (
                    <div>
                      <h3 className="text-white font-fredoka mb-2">Special Instructions</h3>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <p className="text-yellow-400 font-raleway">{selectedOrder.specialInstructions}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-4">
                    {selectedOrder.status === 'new' && (
                      <button
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, 'preparing');
                          setShowOrderDetails(false);
                        }}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg font-raleway font-semibold"
                      >
                        Accept & Start Preparing
                      </button>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <button
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, 'ready');
                          setShowOrderDetails(false);
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-raleway font-semibold"
                      >
                        Mark as Ready
                      </button>
                    )}
                    {selectedOrder.status === 'ready' && (
                      <button
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, 'completed');
                          setShowOrderDetails(false);
                        }}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-raleway font-semibold"
                      >
                        Mark as Completed
                      </button>
                    )}
                    <button
                      onClick={() => setShowOrderDetails(false)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-raleway transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ZoneShopLayout>
  );
};

export default LiveOrders;
