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
  FaBell
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const LiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock live orders data
  const mockOrders = [
    {
      id: 'ORD-2024-001',
      customerName: 'John Doe',
      customerPhone: '+1 (555) 123-4567',
      restaurant: 'Bella Vista',
      restaurantType: 'Single Restaurant',
      tableNumber: 'T-05',
      items: [
        { name: 'Margherita Pizza', quantity: 1, price: 18.99 },
        { name: 'Caesar Salad', quantity: 1, price: 12.99 },
        { name: 'Coca Cola', quantity: 2, price: 3.99 }
      ],
      total: 39.96,
      status: 'preparing',
      orderTime: '2024-01-15T14:30:00Z',
      estimatedTime: '25 mins',
      priority: 'normal'
    },
    {
      id: 'ORD-2024-002',
      customerName: 'Sarah Wilson',
      customerPhone: '+1 (555) 987-6543',
      restaurant: 'Downtown Food Zone - Pizza Corner',
      restaurantType: 'Zone Shop',
      zone: 'Downtown Food Zone',
      tableNumber: 'Z1-T-12',
      items: [
        { name: 'Chicken Biryani', quantity: 2, price: 16.99 },
        { name: 'Mango Lassi', quantity: 2, price: 4.99 }
      ],
      total: 43.96,
      status: 'confirmed',
      orderTime: '2024-01-15T14:45:00Z',
      estimatedTime: '30 mins',
      priority: 'high'
    },
    {
      id: 'ORD-2024-003',
      customerName: 'Mike Johnson',
      customerPhone: '+1 (555) 456-7890',
      restaurant: 'Golden Spoon',
      restaurantType: 'Single Restaurant',
      tableNumber: 'T-08',
      items: [
        { name: 'Grilled Salmon', quantity: 1, price: 24.99 },
        { name: 'Asparagus', quantity: 1, price: 8.99 },
        { name: 'White Wine', quantity: 1, price: 12.99 }
      ],
      total: 46.97,
      status: 'ready',
      orderTime: '2024-01-15T14:15:00Z',
      estimatedTime: 'Ready',
      priority: 'urgent'
    }
  ];

  useEffect(() => {
    // Load orders
    setOrders(mockOrders);
    setLoading(false);

    // Auto-refresh every 30 seconds
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        // In real app, this would fetch fresh data
        console.log('Refreshing orders...');
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'status-info bg-status-info-light';
      case 'preparing': return 'status-warning bg-status-warning-light';
      case 'ready': return 'status-success bg-status-success-light';
      case 'delivered': return 'status-success bg-status-success-light';
      case 'cancelled': return 'status-error bg-status-error-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'status-error bg-status-error-light';
      case 'high': return 'status-warning bg-status-warning-light';
      case 'normal': return 'status-info bg-status-info-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.restaurant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading live orders...</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Live Orders</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Real-time order monitoring across all restaurants and zones</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-raleway font-semibold flex items-center space-x-2 transition-colors ${autoRefresh
                ? 'btn-primary'
                : 'btn-secondary'
                }`}
            >
              <FaRedo className={autoRefresh ? 'animate-spin' : ''} />
              <span>{autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="admin-card rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
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
              className="w-full sm:w-auto input-theme rounded-lg px-4 py-2 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card rounded-2xl p-6 hover:border-theme-accent-primary/30 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedOrder(order)}
            >
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-fredoka text-theme-text-primary">{order.id}</h3>
                  <p className="text-theme-text-secondary font-raleway text-sm">{getTimeSinceOrder(order.orderTime)}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(order.status)}`}>
                    {order.status.toUpperCase()}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-raleway ${getPriorityColor(order.priority)}`}>
                    {order.priority.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2">
                  <FaUser className="text-theme-text-tertiary" />
                  <span className="text-theme-text-primary font-raleway">{order.customerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaStore className="text-theme-text-tertiary" />
                  <span className="text-theme-text-secondary font-raleway text-sm">{order.restaurant}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaMapMarkerAlt className="text-theme-text-tertiary" />
                  <span className="text-theme-text-secondary font-raleway text-sm">Table {order.tableNumber}</span>
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t border-theme-border-primary pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-theme-text-secondary font-raleway text-sm">{order.items.length} items</span>
                  <span className="text-theme-text-primary font-raleway font-semibold">₹{order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-theme-text-tertiary font-raleway text-xs">Est. Time</span>
                  <span className="text-theme-accent-primary font-raleway text-sm font-semibold">{order.estimatedTime}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <FaShoppingCart className="text-6xl text-theme-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Orders Found</h3>
            <p className="text-theme-text-secondary font-raleway">No orders match your current filters.</p>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default LiveOrders;
