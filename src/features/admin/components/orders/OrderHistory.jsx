import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaDownload,
  FaCalendarAlt,
  FaStore,
  FaUser,
  FaDollarSign,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaRedo,
  FaUtensils,
  FaChevronLeft,
  FaChevronRight,
  FaPhone
} from 'react-icons/fa';
import { useGetLiveOrdersQuery } from '../../../../store/api/ordersApi';
import SuperAdminLayout from '../SuperAdminLayout';

const OrderHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const ordersPerPage = 24;
  const { user } = useSelector((state) => state.ui.auth);

  // Fetch real orders data (same as live orders but filter for completed)
  const { 
    data: ordersData, 
    isLoading: loading, 
    error: ordersError,
    refetch 
  } = useGetLiveOrdersQuery({
    role: 'admin',
    entityId: null,
    limit: 500  // Request more orders for history
  }, {
    pollingInterval: 0, // No auto-refresh for history
    refetchOnMountOrArgChange: true
  });

  // Transform data from API response with better zone/restaurant name handling
  const allOrders = Array.isArray(ordersData) ? ordersData.map(order => {
    // Handle restaurant vs zone naming (same logic as LiveOrders)
    let restaurantName = 'Unknown Restaurant';
    let restaurantType = 'Single Restaurant';
    
    if (order.restaurantId?.name) {
      restaurantName = order.restaurantId.name;
      restaurantType = 'Single Restaurant';
    } else if (order.zoneId?.name) {
      restaurantName = order.zoneId.name;
      restaurantType = 'Zone';
      
      // If there's shop information, append it
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
      orderTime: order.createdAt || new Date().toISOString(),
      completedTime: order.updatedAt || order.createdAt || new Date().toISOString(),
      paymentMethod: order.paymentMethod || 'Cash'
    };
  }) : [];

  // Filter to show completed/delivered orders only
  const orders = allOrders.filter(order => 
    ['completed', 'delivered', 'cancelled'].includes(order.status)
  );

  // Handle manual refresh
  const handleRefresh = () => {
    refetch();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'refunded': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <FaCheckCircle />;
      case 'cancelled': return <FaTimesCircle />;
      default: return <FaClock />;
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

  // Pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full animate-spin mx-auto mb-4 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-raleway">Loading order history...</p>
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
            <FaExclamationTriangle className="text-6xl text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-gray-800 dark:text-gray-200 mb-2">Error Loading Order History</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 font-raleway">
              {ordersError?.data?.message || ordersError?.message || 'Failed to load order history from database'}
            </p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2 mx-auto dark:bg-blue-700 dark:hover:bg-blue-800"
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
            <h1 className="text-2xl md:text-3xl font-fredoka text-gray-800 dark:text-gray-200 mb-1">Order History</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-raleway">Complete order history across all restaurants and zones</p>
          </div>
          <div className="flex space-x-3">
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-raleway font-semibold flex items-center space-x-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
            >
              <FaFilter />
              <span>Filters</span>
            </button>
            
          </div>
          <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-2xl p-4 overflow-hidden bg-white dark:bg-primary border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg pl-10 pr-4 py-2 focus:outline-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-primary text-gray-800 dark:text-gray-200"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg px-4 py-2 focus:outline-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-primary text-gray-800 dark:text-gray-200"
                >
                  <option value="all">All Status</option>
                  <option value="delivered">Delivered</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="rounded-lg px-4 py-2 focus:outline-none border border-gray-300 dark:border-gray-600 bg-white dark:bg-primary text-gray-800 dark:text-gray-200"
                >
                  <option value="1d">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
            </motion.div>
       
        </div>


        {/* Order Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center dark:bg-blue-900/30">
                <FaHistory className="text-blue-600 dark:text-blue-400 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-raleway">Total Orders</p>
                <p className="text-gray-800 dark:text-gray-200 text-2xl font-fredoka font-bold">{orders.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center dark:bg-green-900/30">
                <FaCheckCircle className="text-green-600 dark:text-green-400 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-raleway">Delivered</p>
                <p className="text-gray-800 dark:text-gray-200 text-2xl font-fredoka font-bold">
                  {orders.filter(o => o.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-5 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-100 dark:border-red-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center dark:bg-red-900/30">
                <FaTimesCircle className="text-red-600 dark:text-red-400 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-raleway">Cancelled</p>
                <p className="text-gray-800 dark:text-gray-200 text-2xl font-fredoka font-bold">
                  {orders.filter(o => o.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-5 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-100 dark:border-purple-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center dark:bg-purple-900/30">
                <FaDollarSign className="text-purple-600 dark:text-purple-400 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-raleway">Total Revenue</p>
                <p className="text-gray-800 dark:text-gray-200 text-2xl font-fredoka font-bold">
                  ₹{orders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="rounded-2xl p-6 bg-white dark:bg-primary border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <h2 className="text-xl font-fredoka text-gray-800 dark:text-gray-200">Order History</h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-raleway">
                Showing {indexOfFirstOrder + 1}-{Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
              </div>
          </div>

          {currentOrders.length === 0 ? (
            <div className="text-center py-12">
              <FaHistory className="text-6xl text-gray-400 mx-auto mb-4 opacity-50 dark:text-gray-500" />
              <h3 className="text-xl font-fredoka text-gray-800 dark:text-gray-200 mb-2">
                {orders.length === 0 ? 'No Order History Available' : 'No Orders Found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto font-raleway">
                {orders.length === 0 
                  ? 'No completed orders found. Completed orders will appear here once they are finished.'
                  : 'No orders match your current filters. Try adjusting your search criteria.'
                }
              </p>
              {orders.length === 0 && (
                <button
                  onClick={handleRefresh}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-raleway font-semibold flex items-center space-x-2 mx-auto dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  <FaRedo />
                  <span>Refresh History</span>
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
                  className="rounded-2xl p-5 bg-white dark:bg-primary border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-fredoka text-gray-800 dark:text-gray-200">#{order.orderNumber || order.id}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm font-raleway">
                        {new Date(order.orderTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-raleway ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{order.status.toUpperCase()}</span>
                      </div>
                      {order.isMergedOrder && (
                        <div className="mt-1 px-2 py-1 rounded-full text-xs font-raleway bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          ZONE ORDER
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <FaUser className="text-gray-500 dark:text-gray-400 w-4 h-4" />
                      <span className="text-gray-800 dark:text-gray-200 font-raleway truncate max-w-[180px]">{order.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaPhone className="text-gray-500 dark:text-gray-400 w-4 h-4" />
                      <span className="text-gray-600 dark:text-gray-400 font-raleway text-sm">{order.customerPhone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaMapMarkerAlt className="text-gray-500 dark:text-gray-400 w-4 h-4" />
                      <span className="text-gray-600 dark:text-gray-400 font-raleway text-sm">Table {order.tableNumber}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FaStore className="text-gray-500 dark:text-gray-400 w-4 h-4" />
                      <span className="text-gray-600 dark:text-gray-400 font-raleway text-sm truncate max-w-[180px]">{order.restaurant}</span>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400 font-raleway text-sm">
                        {order.isMergedOrder ? `${order.shopCount || 0} shops` : `${order.items.length} items`}
                      </span>
                      <span className="text-gray-800 dark:text-gray-200 font-sans font-bold">₹{(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredOrders.length > ordersPerPage && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                disabled={currentPage === 1}
                className={`p-3 rounded-lg flex items-center ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'}`}
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
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                disabled={currentPage === totalPages}
                className={`p-3 rounded-lg flex items-center ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'}`}
              >
                Next <FaChevronRight className="ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default OrderHistory;