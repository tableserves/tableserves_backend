import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaShoppingCart,
  FaEye,
  FaFilter,
  FaSearch,
  FaClock,
  FaCheck,
  FaTimes,
  FaStore,
  FaUser,
  FaDollarSign,
  FaCalendarAlt,
  FaDownload
} from 'react-icons/fa';
import ZoneAdminLayout from '../ZoneAdminLayout';
import LocalStorageService from '../../../services/LocalStorageService';

const OrderMonitoring = () => {
  const { zoneId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    const loadOrders = () => {
      setLoading(true);
      try {
        // Load orders from localStorage - in real app this would be from API
        const zoneOrders = LocalStorageService.getItem(`zone_orders_${zoneId}`) || [];
        setOrders(zoneOrders);
      } catch (error) {
        console.error('Error loading orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (zoneId) {
      loadOrders();
    }
  }, [zoneId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-status-warning bg-status-warning-light';
      case 'confirmed': return 'text-status-info bg-status-info-light';
      case 'preparing': return 'text-status-warning bg-status-warning-light';
      case 'ready': return 'text-status-success bg-status-success-light';
      case 'delivered': return 'text-status-success bg-status-success-light';
      case 'cancelled': return 'text-status-error bg-status-error-light';
      default: return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toString().includes(searchTerm) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shopName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesShop = shopFilter === 'all' || order.shopId === shopFilter;
    
    // Date filtering
    const orderDate = new Date(order.createdAt);
    const today = new Date();
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && orderDate.toDateString() === today.toDateString()) ||
      (dateFilter === 'week' && orderDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === 'month' && orderDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

    return matchesSearch && matchesStatus && matchesShop && matchesDate;
  });

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  if (loading) {
    return (
      <ZoneAdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading orders...</p>
          </div>
        </div>
      </ZoneAdminLayout>
    );
  }

  return (
    <ZoneAdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-fredoka text-theme-text-primary mb-2">
            Order Monitoring
          </h1>
          <p className="text-theme-text-secondary font-raleway">
            Monitor all orders across your zone in real-time
          </p>
        </div>

        {/* Filters */}
        <div className="admin-card rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-theme rounded-lg pl-10 pr-4 py-2 w-full"
                  placeholder="Search orders..."
                />
              </div>
            </div>

            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Shop</label>
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="all">All Shops</option>
                {/* Shop options would be loaded from zone shops */}
              </select>
            </div>

            <div>
              <label className="block text-theme-text-primary font-raleway font-medium mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input-theme rounded-lg px-4 py-2 w-full"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="admin-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-bg-secondary">
                <tr>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Order ID</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Customer</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Shop</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Amount</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Status</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Time</th>
                  <th className="text-left p-4 text-theme-text-primary font-raleway font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-8">
                      <div className="text-theme-text-tertiary">
                        <FaShoppingCart className="text-4xl mx-auto mb-4 opacity-50" />
                        <p className="font-raleway">No orders found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-theme-border-primary hover:bg-theme-bg-hover transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-raleway font-medium text-theme-text-primary">#{order.id}</span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-raleway font-medium text-theme-text-primary">{order.customerName || 'Guest'}</p>
                          <p className="text-theme-text-tertiary font-raleway text-sm">Table {order.tableNumber}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <FaStore className="text-theme-accent-primary" />
                          <span className="font-raleway text-theme-text-primary">{order.shopName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-raleway font-semibold text-theme-text-primary">₹{order.total}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-raleway text-theme-text-primary text-sm">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </p>
                          <p className="font-raleway text-theme-text-tertiary text-xs">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 text-theme-text-secondary hover:text-theme-accent-primary hover:bg-theme-accent-primary/10 rounded-lg transition-colors"
                          title="View Order Details"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="admin-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-fredoka text-theme-text-primary">
                  Order Details - #{selectedOrder.id}
                </h2>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-theme-text-tertiary hover:text-theme-text-primary"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Order Information</h3>
                    <div className="space-y-2">
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Customer:</strong> {selectedOrder.customerName || 'Guest'}
                      </p>
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Table:</strong> {selectedOrder.tableNumber}
                      </p>
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Shop:</strong> {selectedOrder.shopName}
                      </p>
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Payment Details</h3>
                    <div className="space-y-2">
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Subtotal:</strong> ₹{selectedOrder.subtotal || selectedOrder.total}
                      </p>
                      <p className="text-theme-text-secondary font-raleway">
                        <strong>Tax:</strong> ₹{selectedOrder.tax || 0}
                      </p>
                      <p className="text-theme-text-primary font-raleway font-semibold text-lg">
                        <strong>Total:</strong> ₹{selectedOrder.total}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-fredoka text-theme-text-primary mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-theme-bg-secondary rounded-lg">
                        <div>
                          <p className="font-raleway font-medium text-theme-text-primary">{item.name}</p>
                          <p className="text-theme-text-tertiary font-raleway text-sm">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-raleway font-semibold text-theme-text-primary">₹{item.price * item.quantity}</p>
                      </div>
                    )) || (
                      <p className="text-theme-text-tertiary font-raleway">No items details available</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ZoneAdminLayout>
  );
};

export default OrderMonitoring;
