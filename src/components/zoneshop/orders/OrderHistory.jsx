import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { 
  FaHistory, 
  FaSearch, 
  FaFilter,
  FaDownload,
  FaEye,
  FaCalendarAlt,
  FaUser,
  FaDollarSign,
  FaMapMarkerAlt,
  FaClock,
  FaStar,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import ZoneShopLayout from '../ZoneShopLayout';
import Receipt from '../../common/Receipt'; // Import the Receipt component
import { downloadPdf } from '../../../utils/downloadUtils'; // Import the download utility

const OrderHistory = () => {
  const { zoneId, shopId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const receiptRef = useRef();

  // Real order history data will be loaded from localStorage


  useEffect(() => {
    const loadOrders = () => {
      setLoading(true);
      try {
        // Load real order history from localStorage
        const orderHistory = JSON.parse(localStorage.getItem(`tableserve_zone_${zoneId}_shop_${shopId}_order_history`) || '[]');
        setOrders(orderHistory);
      } catch (error) {
        console.error('Error loading order history:', error);
        setOrders([]);
      }
      setLoading(false);
    };

    loadOrders();
  }, [zoneId, shopId]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.orderTime);
      const today = new Date();
      const daysDiff = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
        default:
          matchesDate = true;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'refunded': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FaCheckCircle className="text-green-400" />;
      case 'cancelled': return <FaTimesCircle className="text-red-400" />;
      case 'refunded': return <FaDollarSign className="text-yellow-400" />;
      default: return <FaClock className="text-gray-400" />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const exportOrders = () => {
    const csvContent = [
      ['Order ID', 'Customer', 'Table', 'Total', 'Status', 'Date', 'Rating'],
      ...filteredOrders.map(order => [
        order.id,
        order.customerName,
        order.tableNumber,
        order.total,
        order.status,
        formatDate(order.orderTime),
        order.rating || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order-history.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadReceipt = () => {
    if (selectedOrder) {
      // Use a short timeout to ensure the component is rendered
      setTimeout(() => {
        downloadPdf(receiptRef.current, `receipt-${selectedOrder.id}.pdf`);
      }, 100);
    }
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading order history...</div>
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
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Order History</h1>
            <p className="text-secondary font-raleway">View and manage your past orders</p>
          </div>
          <button
            onClick={exportOrders}
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-raleway font-semibold flex items-center justify-center space-x-2"
          >
            <FaDownload />
            <span>Export Orders</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-secondary backdrop-blur-lg rounded-xl p-4 border border-secondary">
            <h3 className="text-2xl font-fredoka text-secondary">{orders.length}</h3>
            <p className="text-secondary font-raleway text-sm">Total Orders</p>
          </div>
          <div className="bg-secondary backdrop-blur-lg rounded-xl p-4 border border-secondary">
            <h3 className="text-2xl font-fredoka text-green-400">{orders.filter(o => o.status === 'completed').length}</h3>
            <p className="text-secondary font-raleway text-sm">Completed</p>
          </div>
          <div className="bg-secondary backdrop-blur-lg rounded-xl p-4 border border-secondary">
            <h3 className="text-2xl font-fredoka text-accent">₹{orders.reduce((sum, o) => sum + (o.status === 'completed' ? o.total : 0), 0).toFixed(0)}</h3>
            <p className="text-secondary font-raleway text-sm">Total Revenue</p>
          </div>
          <div className="bg-secondary backdrop-blur-lg rounded-xl p-4 border border-secondary">
            <h3 className="text-2xl font-fredoka text-yellow-400">
              {orders.filter(o => o.rating).length > 0 
                ? (orders.filter(o => o.rating).reduce((sum, o) => sum + o.rating, 0) / orders.filter(o => o.rating).length).toFixed(1)
                : '0.0'
              }
            </h3>
            <p className="text-secondary font-raleway text-sm">Avg Rating</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bgsecondary backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-secondary">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search by order ID, customer name, or table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-secondary border border-secondary rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-secondary border border-secondary rounded-lg px-4 py-2 text-secondary focus:outline-none focus:border-accent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-secondary border border-secondary rounded-lg px-4 py-2 text-secondary focus:outline-none focus:border-accent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 cursor-pointer hover:bg-white/15 transition-colors"
              onClick={() => handleOrderClick(order)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                    <FaHistory className="text-accent text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-fredoka text-lg">{order.id}</h3>
                    <p className="text-white/60 font-raleway text-sm">{formatDate(order.orderTime)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-white font-fredoka text-xl">${order.total}</p>
                    <p className="text-white/60 font-raleway text-sm">{order.paymentMethod}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span className={`px-3 py-1 rounded-full text-xs font-raleway font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <FaUser className="text-white/60" />
                  <span className="text-white font-raleway">{order.customerName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaMapMarkerAlt className="text-white/60" />
                  <span className="text-white font-raleway">Table {order.tableNumber}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaClock className="text-white/60" />
                  <span className="text-white font-raleway">{order.preparationTime} min prep</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-white/70 font-raleway text-sm">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </span>
                    {order.rating && (
                      <div className="flex items-center space-x-1">
                        <FaStar className="text-yellow-400" />
                        <span className="text-white font-raleway">{order.rating}</span>
                      </div>
                    )}
                  </div>
                  <button className="text-accent hover:text-accent/80 font-raleway text-sm flex items-center space-x-2">
                    <FaEye />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
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
                <div className="absolute -z-10" style={{ visibility: 'hidden' }}>
                  <Receipt ref={receiptRef} orderDetails={selectedOrder} />
                </div>
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
                        <h3 className="text-white font-fredoka mb-2">Order Information</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Order ID:</span>
                            <span className="text-white font-raleway">{selectedOrder.id}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Status:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-raleway ${getStatusColor(selectedOrder.status)}`}>
                              {selectedOrder.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Table:</span>
                            <span className="text-white font-raleway">{selectedOrder.tableNumber}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Payment:</span>
                            <span className="text-white font-raleway">{selectedOrder.paymentMethod}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-white font-fredoka mb-2">Customer Information</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Name:</span>
                            <span className="text-white font-raleway">{selectedOrder.customerName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Phone:</span>
                            <span className="text-white font-raleway">{selectedOrder.customerPhone}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Order Time:</span>
                            <span className="text-white font-raleway">{formatDate(selectedOrder.orderTime)}</span>
                          </div>
                          {selectedOrder.completedTime && (
                            <div className="flex items-center justify-between">
                              <span className="text-white/60">Completed:</span>
                              <span className="text-white font-raleway">{formatDate(selectedOrder.completedTime)}</span>
                            </div>
                          )}
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

                  {/* Rating & Feedback */}
                  {selectedOrder.rating && (
                    <div>
                      <h3 className="text-white font-fredoka mb-2">Customer Feedback</h3>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <FaStar
                                key={i}
                                className={i < selectedOrder.rating ? 'text-yellow-400' : 'text-white/20'}
                              />
                            ))}
                          </div>
                          <span className="text-white font-raleway">{selectedOrder.rating}/5</span>
                        </div>
                        {selectedOrder.feedback && (
                          <p className="text-white/80 font-raleway">{selectedOrder.feedback}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cancellation Reason */}
                  {selectedOrder.status === 'cancelled' && selectedOrder.cancellationReason && (
                    <div>
                      <h3 className="text-white font-fredoka mb-2">Cancellation Reason</h3>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <p className="text-red-400 font-raleway">{selectedOrder.cancellationReason}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4">
                    <button
                      onClick={handleDownloadReceipt}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <FaDownload />
                      <span>Download Receipt</span>
                    </button>
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

export default OrderHistory;
