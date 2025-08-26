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
import ZoneShopLayout from '../ZoneShopLayout';

const ZoneShopOrderReports = () => {
  const { zoneId, shopId } = useParams();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dateRange, setDateRange] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const loadOrders = () => {
      setLoading(true);
      try {
        // Load real order data from localStorage
        const orderData = JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_shop_${shopId}_orders`) || '[]');
        setOrders(orderData);
        setFilteredOrders(orderData);
      } catch (error) {
        console.error('Error loading order data:', error);
        setOrders([]);
        setFilteredOrders([]);
      }
      setLoading(false);
    };

    loadOrders();
  }, [zoneId, shopId]);

  useEffect(() => {
    // Filter orders based on search term and status
    let filtered = orders.filter(order => {
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase());
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
    return new Date(timeString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateStats = () => {
    const completed = filteredOrders.filter(order => order.status === 'completed');
    const totalRevenue = completed.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0;

    return {
      totalOrders: filteredOrders.length,
      completedOrders: completed.length,
      totalRevenue,
      avgOrderValue,
      cancelledOrders: filteredOrders.filter(order => order.status === 'cancelled').length
    };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const csvContent = [
      ['Order ID', 'Customer', 'Table', 'Items', 'Total', 'Status', 'Order Time', 'Payment Method'],
      ...filteredOrders.map(order => [
        order.id,
        order.customerName,
        order.tableNumber,
        order.items.map(item => `${item.name} x${item.quantity}`).join('; '),
        order.total,
        order.status,
        new Date(order.orderTime).toLocaleString(),
        order.paymentMethod
      ])
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
    <ZoneShopLayout>
      <div className="space-y-6">
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
              <FaRupeeSign className="text-blue-500 text-xl" />
              <div>
                <p className="text-2xl font-fredoka text-theme-text-primary">₹{Math.round(stats.avgOrderValue)}</p>
                <p className="text-theme-text-secondary font-raleway text-sm">Avg Order</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
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
                  placeholder="Search orders, customers, tables..."
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
                  <th className="text-left p-4 font-raleway font-medium text-theme-text-primary">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-theme-border-primary hover:bg-theme-bg-hover"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-raleway font-medium text-theme-text-primary">{order.id}</p>
                        <p className="text-sm text-theme-text-tertiary">{order.tableNumber}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-raleway text-theme-text-primary">{order.customerName}</p>
                      <p className="text-sm text-theme-text-tertiary capitalize">{order.paymentMethod}</p>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-sm text-theme-text-secondary">
                            {item.name} x{item.quantity}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-raleway font-medium text-theme-text-primary">₹{order.total}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-raleway capitalize ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-theme-text-primary">{formatTime(order.orderTime)}</p>
                      {order.completedTime && (
                        <p className="text-xs text-theme-text-tertiary">
                          Completed: {formatTime(order.completedTime)}
                        </p>
                      )}
                    </td>
                  </motion.tr>
                ))}
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
  );
};

export default ZoneShopOrderReports;
