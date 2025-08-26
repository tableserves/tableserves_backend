import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FaShoppingCart,
  FaClock,
  FaCheck,
  FaTimes,
  FaEye,
  FaUtensils,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaDollarSign,
  FaFilter,
  FaSearch,
  FaBell,
  FaPlay,
  FaPause
} from 'react-icons/fa';
import SingleRestaurantLayout from '../../components/owner/SingleRestaurantLayout';

const OrderManagement = () => {
  const { restaurantId } = useParams();
  const location = useLocation();
  const { user } = useSelector((state) => state.ui.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Determine view type based on route
  const getViewType = () => {
    if (location.pathname.includes('/orders/live')) return 'live';
    if (location.pathname.includes('/orders/history')) return 'history';
    if (location.pathname.includes('/orders/feedback')) return 'feedback';
    return 'live';
  };

  const viewType = getViewType();
  const [activeTab, setActiveTab] = useState(viewType === 'live' ? 'pending' : 'completed');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);



  useEffect(() => {
    loadOrders();

    // Auto-refresh orders every 30 seconds
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadOrders, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restaurantId, autoRefresh]);

  const loadOrders = () => {
    try {
      // Load real orders from localStorage or OrderProcessingService
      const savedOrders = localStorage.getItem(`orders_${restaurantId}`);
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      } else {
        setOrders([]); // Start with empty orders
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = (orderId, newStatus) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem(`orders_${restaurantId}`, JSON.stringify(updatedOrders));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNumber.toString().includes(searchTerm);
    return matchesTab && matchesSearch;
  });

  const getOrderCounts = () => {
    return {
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      completed: orders.filter(o => o.status === 'completed').length,
      all: orders.length
    };
  };

  const orderCounts = getOrderCounts();

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (date) => {
    const minutes = Math.floor((Date.now() - new Date(date)) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  if (loading) {
    return (
      <SingleRestaurantLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-primary font-raleway">Loading orders...</p>
          </div>
        </div>
      </SingleRestaurantLayout>
    );
  }

  // Render functions for different view types
  const renderLiveOrders = () => {
    if (filteredOrders.length === 0) {
      return (
        <div className="text-center py-12">
          <FaShoppingCart className="w-16 h-16 text-theme-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Live Orders</h3>
          <p className="text-theme-text-secondary font-raleway">
            New orders will appear here when customers place them.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card rounded-2xl p-6 hover:border-theme-accent-primary/30 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-fredoka text-theme-text-primary">#{order.id}</h3>
                <p className="text-theme-text-secondary font-raleway text-sm">Table {order.tableNumber}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-white text-sm font-raleway ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSelectedOrder(order);
                  setShowOrderModal(true);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-raleway text-sm"
              >
                View Details
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderOrderHistory = () => {
    if (filteredOrders.length === 0) {
      return (
        <div className="text-center py-12">
          <FaClock className="w-16 h-16 text-theme-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Order History</h3>
          <p className="text-theme-text-secondary font-raleway">
            Completed orders will appear here for your records.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card rounded-lg p-4 hover:border-theme-accent-primary/30 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="text-lg font-fredoka text-theme-text-primary">#{order.id}</h3>
                  <p className="text-theme-text-secondary font-raleway text-sm">
                    {order.orderTime ? formatTime(order.orderTime) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-theme-accent-primary font-raleway font-semibold">
                  ${order.total?.toFixed(2) || '0.00'}
                </p>
                <p className="text-theme-text-secondary font-raleway text-sm">
                  Table {order.tableNumber}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderFeedback = () => {
    const savedFeedback = localStorage.getItem(`feedback_${restaurantId}`);
    const feedback = savedFeedback ? JSON.parse(savedFeedback) : [];

    if (feedback.length === 0) {
      return (
        <div className="text-center py-12">
          <FaBell className="w-16 h-16 text-theme-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Customer Feedback</h3>
          <p className="text-theme-text-secondary font-raleway">
            Customer reviews and feedback will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {feedback.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-fredoka text-theme-text-primary">{item.customerName}</h3>
                <p className="text-theme-text-secondary font-raleway text-sm">
                  Order #{item.orderId} • Table {item.tableNumber}
                </p>
              </div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <FaBell
                    key={i}
                    className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-theme-text-primary font-raleway">{item.comment}</p>
            <p className="text-theme-text-tertiary font-raleway text-sm mt-2">
              {formatTime(item.timestamp)}
            </p>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <SingleRestaurantLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">
              {viewType === 'live' && 'Live Orders'}
              {viewType === 'history' && 'Order History'}
              {viewType === 'feedback' && 'Customer Feedback'}
            </h1>
            <p className="text-secondary font-raleway text-sm sm:text-base">
              {viewType === 'live' && 'Monitor and manage incoming orders'}
              {viewType === 'history' && 'View past orders and order analytics'}
              {viewType === 'feedback' && 'Customer reviews and feedback'}
            </p>
          </div>

          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-raleway text-sm ${autoRefresh
                ? 'bg-green-500 text-white'
                : 'bg-theme-bg-secondary text-theme-text-primary'
                }`}
            >
              {autoRefresh ? <FaPause /> : <FaPlay />}
              <span>{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}</span>
            </button>

            <button
              onClick={loadOrders}
              className="btn-primary px-4 py-2 rounded-lg font-raleway text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="relative mb-4">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
            <input
              type="text"
              placeholder="Search by customer name, order ID, or table number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-theme-border-primary rounded-lg bg-theme-bg-primary text-theme-text-primary focus:outline-none focus:border-theme-accent-primary"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Orders', count: orderCounts.all },
              { key: 'pending', label: 'Pending', count: orderCounts.pending },
              { key: 'preparing', label: 'Preparing', count: orderCounts.preparing },
              { key: 'ready', label: 'Ready', count: orderCounts.ready },
              { key: 'completed', label: 'Completed', count: orderCounts.completed }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg font-raleway text-sm flex items-center space-x-2 ${activeTab === tab.key
                  ? 'bg-theme-accent-primary text-theme-text-inverse'
                  : 'bg-theme-bg-secondary text-theme-text-primary hover:bg-theme-bg-tertiary'
                  }`}
              >
                <span>{tab.label}</span>
                <span className="bg-white/20 px-2 py-1 rounded-full text-xs">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card rounded-2xl p-6 hover:border-theme-accent-primary/30 transition-all duration-300"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-fredoka text-theme-text-primary">#{order.id}</h3>
                  <p className="text-theme-text-secondary font-raleway text-sm">Table {order.tableNumber}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-white text-sm font-raleway ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-4 p-3 bg-theme-bg-secondary rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <FaUser className="text-theme-text-tertiary" />
                  <span className="text-theme-text-primary font-raleway text-sm">{order.customerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaPhone className="text-theme-text-tertiary" />
                  <span className="text-theme-text-secondary font-raleway text-sm">{order.customerPhone}</span>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4">
                <h4 className="text-theme-text-primary font-raleway font-medium mb-2">Items ({order.items.length})</h4>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-theme-text-secondary font-raleway">{item.quantity}x {item.name}</span>
                      <span className="text-theme-text-primary font-raleway">${item.price}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-theme-text-tertiary font-raleway text-sm">+{order.items.length - 2} more items</p>
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div className="mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-theme-text-secondary font-raleway text-sm">Order Time:</span>
                  <span className="text-theme-text-primary font-raleway text-sm">{formatTime(order.orderTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-text-secondary font-raleway text-sm">Time Ago:</span>
                  <span className="text-theme-text-primary font-raleway text-sm">{getTimeAgo(order.orderTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-text-secondary font-raleway text-sm">Total:</span>
                  <span className="text-theme-accent-primary font-raleway font-semibold">${order.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowOrderModal(true);
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-raleway text-sm flex items-center justify-center space-x-1"
                >
                  <FaEye />
                  <span>View Details</span>
                </button>

                <div className="flex space-x-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-raleway text-sm"
                    >
                      Accept
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-raleway text-sm"
                    >
                      Mark Ready
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-raleway text-sm"
                    >
                      Complete
                    </button>
                  )}

                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-raleway text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <FaShoppingCart className="text-6xl text-theme-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Orders Found</h3>
            <p className="text-theme-text-secondary font-raleway">
              {searchTerm ? 'No orders match your search criteria.' : 'No orders for the selected status.'}
            </p>
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-fredoka text-theme-text-primary">Order Details - #{selectedOrder.id}</h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Customer & Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Customer Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <FaUser className="text-theme-text-tertiary" />
                      <span className="text-theme-text-primary font-raleway">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaPhone className="text-theme-text-tertiary" />
                      <span className="text-theme-text-primary font-raleway">{selectedOrder.customerPhone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaMapMarkerAlt className="text-theme-text-tertiary" />
                      <span className="text-theme-text-primary font-raleway">Table {selectedOrder.tableNumber}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Order Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-theme-text-secondary font-raleway">Order Time:</span>
                      <span className="text-theme-text-primary font-raleway">{formatTime(selectedOrder.orderTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-text-secondary font-raleway">Status:</span>
                      <span className={`px-2 py-1 rounded text-white text-sm ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusText(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-text-secondary font-raleway">Total:</span>
                      <span className="text-theme-accent-primary font-raleway font-semibold">${selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-theme-bg-secondary rounded-lg">
                      <div>
                        <h4 className="text-theme-text-primary font-raleway font-medium">{item.name}</h4>
                        <p className="text-theme-text-secondary font-raleway text-sm">Quantity: {item.quantity}</p>
                      </div>
                      <span className="text-theme-text-primary font-raleway font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              {selectedOrder.specialInstructions && (
                <div className="mb-6">
                  <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Special Instructions</h3>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 font-raleway">{selectedOrder.specialInstructions}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 bg-theme-bg-secondary hover:bg-theme-bg-tertiary text-theme-text-primary py-3 rounded-lg font-raleway"
                >
                  Close
                </button>

                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'preparing');
                      setShowOrderModal(false);
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-raleway font-semibold"
                  >
                    Accept Order
                  </button>
                )}

                {selectedOrder.status === 'preparing' && (
                  <button
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'ready');
                      setShowOrderModal(false);
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-raleway font-semibold"
                  >
                    Mark as Ready
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </SingleRestaurantLayout>
  );
};

export default OrderManagement;
