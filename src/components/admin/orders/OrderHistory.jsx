import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaDownload,
  FaEye,
  FaCalendarAlt,
  FaStore,
  FaUser,
  FaDollarSign,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
} from 'react-icons/fa';
import SuperAdminLayout from '../SuperAdminLayout';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Mock historical orders data
  const mockOrders = [
    {
      id: 'ORD-2024-100',
      customerName: 'Alice Johnson',
      customerPhone: '+1 (555) 111-2222',
      restaurant: 'Bella Vista',
      restaurantType: 'Single Restaurant',
      tableNumber: 'T-03',
      items: [
        { name: 'Pepperoni Pizza', quantity: 1, price: 22.99 },
        { name: 'Garlic Bread', quantity: 1, price: 6.99 }
      ],
      total: 29.98,
      status: 'delivered',
      orderTime: '2024-01-14T19:30:00Z',
      completedTime: '2024-01-14T20:15:00Z',
      paymentMethod: 'Credit Card',
      rating: 5
    },
    {
      id: 'ORD-2024-099',
      customerName: 'Bob Smith',
      customerPhone: '+1 (555) 333-4444',
      restaurant: 'Downtown Food Zone - Spice Garden',
      restaurantType: 'Zone Shop',
      zone: 'Downtown Food Zone',
      tableNumber: 'Z1-T-08',
      items: [
        { name: 'Chicken Curry', quantity: 2, price: 18.99 },
        { name: 'Naan Bread', quantity: 3, price: 3.99 },
        { name: 'Basmati Rice', quantity: 2, price: 4.99 }
      ],
      total: 54.94,
      status: 'delivered',
      orderTime: '2024-01-14T18:45:00Z',
      completedTime: '2024-01-14T19:30:00Z',
      paymentMethod: 'UPI',
      rating: 4
    },
    {
      id: 'ORD-2024-098',
      customerName: 'Carol Davis',
      customerPhone: '+1 (555) 555-6666',
      restaurant: 'Golden Spoon',
      restaurantType: 'Single Restaurant',
      tableNumber: 'T-12',
      items: [
        { name: 'Grilled Chicken', quantity: 1, price: 19.99 },
        { name: 'Caesar Salad', quantity: 1, price: 12.99 }
      ],
      total: 32.98,
      status: 'cancelled',
      orderTime: '2024-01-14T17:20:00Z',
      cancelledTime: '2024-01-14T17:25:00Z',
      paymentMethod: 'Cash',
      cancelReason: 'Customer requested cancellation'
    }
  ];

  useEffect(() => {
    // Simulate loading historical orders
    const timer = setTimeout(() => {
      setOrders(mockOrders);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [dateRange]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'status-success bg-green-500/20';
      case 'cancelled': return 'status-error bg-red-500/20';
      case 'refunded': return 'status-warning bg-yellow-500/20';
      default: return 'text-theme-text-tertiary bg-gray-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <FaCheckCircle />;
      case 'cancelled': return <FaTimesCircle />;
      case 'refunded': return <FaClock />;
      default: return <FaClock />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.restaurant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const currentOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportOrders = () => {
    // In real app, this would generate and download a CSV/Excel file
    alert('Export functionality would be implemented here');
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-text-primary font-raleway">Loading order history...</p>
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
            <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Order History</h1>
            <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Complete order history across all restaurants and zones</p>
          </div>
        
        </div>

        {/* Filters and Search */}
        <div className="admin-card rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search orders..."
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
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-theme rounded-lg px-4 py-2 focus:outline-none"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            
          </div>
        </div>

        {/* Orders Table */}
        <div className="admin-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-theme">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left">Order ID</th>
                  <th className="px-6 py-4 text-left">Customer</th>
                  <th className="px-6 py-4 text-left">Restaurant</th>
                  <th className="px-6 py-4 text-left">Table</th>
                  <th className="px-6 py-4 text-left">Total</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((order) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-theme-bg-hover transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-raleway font-medium text-theme-text-primary">{order.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-raleway text-theme-text-primary">{order.customerName}</p>
                        <p className="font-raleway text-sm text-theme-text-tertiary">{order.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-raleway text-theme-text-primary">{order.restaurant}</p>
                        <p className="font-raleway text-sm text-theme-text-tertiary">{order.restaurantType}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-raleway text-theme-text-primary">{order.tableNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-raleway font-semibold text-theme-text-primary">₹{order.total.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{order.status.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-raleway text-sm text-theme-text-secondary">{formatDate(order.orderTime)}</span>
                    </td>
              
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-theme-border-primary px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-theme-text-secondary font-raleway">
                  Showing {(currentPage - 1) * ordersPerPage + 1} to {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <FaHistory className="text-6xl text-theme-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Orders Found</h3>
            <p className="text-theme-text-secondary font-raleway">No orders match your current filters.</p>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
};

export default OrderHistory;
