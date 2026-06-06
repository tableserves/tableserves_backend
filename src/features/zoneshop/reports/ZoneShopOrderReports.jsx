import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaClipboardList,
  FaDownload,
  FaCalendarAlt,
  FaFilter,
  FaSearch,
  FaShoppingCart,
  FaRupeeSign,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import ZoneShopLayout from '../pages/ZoneShopLayout';
import ApiService from '../../../shared/api/ApiService';
import { ErrorBoundary } from '../../../shared/errors/ErrorBoundary';

const ZoneShopOrderReports = () => {
  const { zoneId, shopId } = useParams();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dateRange, setDateRange] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('📊 Zone Shop Reports: Loading orders for:', { zoneId, shopId });
        const response = await ApiService.getShopOrders(zoneId, shopId);
        console.log('📊 Zone Shop Reports: API response:', response);
        
        // Ensure we always have an array
        const orderData = Array.isArray(response) ? response : 
                         (Array.isArray(response?.data) ? response.data : []);
        
        console.log('📊 Zone Shop Reports: Processed orders:', { 
          orderCount: orderData.length,
          orders: orderData 
        });
        
        setOrders(orderData);
        setFilteredOrders(orderData);
      } catch (err) {
        console.error('❌ Zone Shop Reports: Failed to load orders:', err);
        setError('Failed to load order data: ' + (err.message || 'Unknown error'));
        setOrders([]);
        setFilteredOrders([]);
      } finally {
        setLoading(false);
      }
    };

    if (zoneId && shopId) {
      loadOrders();
    } else {
      setError('Missing zone or shop information');
      setLoading(false);
    }
  }, [zoneId, shopId]);

  useEffect(() => {
    // Filter orders based on search term and status
    let filtered = orders.filter(order => {
      // Safely handle potentially undefined properties
      const orderId = (order.orderNumber || order.id || order._id || '').toString();
      const customerName = order.customerName || order.customer?.name || '';
      const tableNumber = (order.tableNumber || order.table || '').toString();
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = orderId.toLowerCase().includes(searchLower) ||
                           customerName.toLowerCase().includes(searchLower) ||
                           tableNumber.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-500" />;
      case 'preparing':
      case 'ready':
        return <FaClock className="text-yellow-500" />;
      case 'cancelled':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaExclamationTriangle className="text-theme-text-tertiary" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'preparing':
        return 'text-blue-600 bg-blue-100';
      case 'ready':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-theme-text-tertiary bg-theme-bg-secondary';
    }
  };

  const formatTime = (timeString) => {
    try {
      if (!timeString) return 'N/A';
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.warn('Error formatting time:', error);
      return 'N/A';
    }
  };

  const formatDate = (timeString) => {
    try {
      if (!timeString) return 'N/A';
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'N/A';
    }
  };

  const calculateStats = () => {
    // Ensure filteredOrders is always an array
    const safeOrders = Array.isArray(filteredOrders) ? filteredOrders : [];
    
    const completed = safeOrders.filter(order => order.status === 'completed');
    const totalRevenue = completed.reduce((sum, order) => {
      const orderTotal = order.total || order.pricing?.total || 0;
      return sum + Number(orderTotal);
    }, 0);

    return {
      totalOrders: safeOrders.length,
      completedOrders: completed.length,
      totalRevenue,
      cancelledOrders: safeOrders.filter(order => order.status === 'cancelled').length
    };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const csvContent = [
      ['Order ID', 'Customer', 'Table', 'Items', 'Total', 'Status', 'Order Time', 'Payment Method'],
      ...filteredOrders.map(order => {
        // Normalize order data for CSV export
        const orderId = order.orderNumber || order.id || order._id || 'N/A';
        const customerName = order.customerName || order.customer?.name || 'Unknown';
        const tableNumber = order.tableNumber || order.table || '1';
        const items = Array.isArray(order.items) 
          ? order.items.map(item => `${item.name || 'Unknown Item'} x${item.quantity || 1}`).join('; ')
          : 'No items';
        const total = order.total || order.pricing?.total || 0;
        const status = order.status || 'pending';
        const orderTime = order.orderTime || order.createdAt || new Date();
        const paymentMethod = order.payment?.method || 'Cash';
        
        return [
          orderId,
          customerName,
          tableNumber,
          items,
          total,
          status,
          new Date(orderTime).toLocaleString(),
          paymentMethod
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-secondary">Loading order reports...</p>
          </div>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ErrorBoundary>
      <ZoneShopLayout>
      <div className="space-y-6">
        {error && (
          <div className="bg-status-error/10 border border-status-error/30 rounded-lg p-4 mb-4">
            <p className="text-status-error font-raleway">{error}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">
              Order Reports
            </h1>
            <p className="text-theme-text-secondary font-raleway">
              Detailed analysis of your order history and performance
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-theme-accent-primary text-white px-4 py-2 rounded-lg hover:bg-theme-accent-hover transition-colors mt-4 sm:mt-0"
          >
            <FaDownload />
            <span className="font-raleway">Export CSV</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <FaShoppingCart className="text-theme-accent-primary text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">{stats.totalOrders}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Total Orders</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <FaCheckCircle className="text-green-500 text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">{stats.completedOrders}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Completed</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <FaRupeeSign className="text-green-600 text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">₹{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Revenue</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card p-4 rounded-xl"
          >
            <div className="flex items-center space-x-3">
              <FaTimesCircle className="text-red-500 text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">{stats.cancelledOrders}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Cancelled</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="admin-card p-6 rounded-xl">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search by order number, customer name, or table..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FaCalendarAlt className="text-theme-text-tertiary" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <FaFilter className="text-theme-text-tertiary" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-theme-border-primary rounded-lg bg-theme-bg-secondary text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="admin-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-bg-secondary">
                <tr>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Order</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Customer</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Items</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Total</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Status</th>
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Order Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => {
                  // Normalize order data for safe rendering
                  const normalizedOrder = {
                    id: order.id || order._id || `Order-${index + 1}`,
                    orderNumber: order.orderNumber || order.order_number || order.orderNum || order.number || order.id || order._id || `#${index + 1}`,
                    customerName: order.customerName || order.customer?.name || 'Unknown Customer',
                    tableNumber: order.tableNumber || order.table || '1',
                    items: Array.isArray(order.items) ? order.items : [],
                    total: order.total || order.pricing?.total || 0,
                    status: order.status || 'pending',
                    orderTime: order.orderTime || order.createdAt || order.timing?.orderPlaced || new Date(),
                    paymentMethod: order.payment?.method || 'Cash'
                  };
                  
                  return (
                    <motion.tr
                      key={normalizedOrder.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-theme-border-primary hover:bg-theme-bg-hover"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-raleway font-medium text-theme-text-primary text-base">{normalizedOrder.orderNumber}</p>
                          <p className="text-sm text-theme-text-tertiary">Table {normalizedOrder.tableNumber}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-raleway text-theme-text-primary">{normalizedOrder.customerName}</p>
                        <p className="text-sm text-theme-text-tertiary capitalize">{normalizedOrder.paymentMethod}</p>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {normalizedOrder.items.map((item, idx) => (
                            <p key={idx} className="text-sm text-theme-text-secondary">
                              {item.name || 'Unknown Item'} x{item.quantity || 1}
                            </p>
                          ))}
                          {normalizedOrder.items.length === 0 && (
                            <p className="text-sm text-theme-text-tertiary">No items</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-raleway font-medium text-theme-text-primary">₹{normalizedOrder.total.toLocaleString('en-IN')}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(normalizedOrder.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-raleway capitalize ${getStatusColor(normalizedOrder.status)}`}>
                            {normalizedOrder.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-theme-text-primary font-medium">{formatTime(normalizedOrder.orderTime)}</p>
                        <p className="text-xs text-theme-text-tertiary">
                          {formatDate(normalizedOrder.orderTime)}
                        </p>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <FaClipboardList className="text-6xl text-theme-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No orders found</h3>
            <p className="text-theme-text-secondary font-raleway">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No orders available for the selected time period'
              }
            </p>
          </div>
        )}
      </div>
      </ZoneShopLayout>
    </ErrorBoundary>
  );
};

export default ZoneShopOrderReports;