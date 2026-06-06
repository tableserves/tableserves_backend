import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPrint,
  FaEye,
  FaCalendarAlt,
  FaUser,
  FaDollarSign,
  FaMapMarkerAlt,
  FaClock,
  FaStar,
  FaCheckCircle,
  FaTimesCircle,
  FaShoppingCart,
  FaSyncAlt,
  FaPhone,
  FaTimes
} from 'react-icons/fa';
import ZoneShopLayout from '../pages/ZoneShopLayout';
import Receipt from '../../../components/common/Receipt';
import { downloadPdf } from '../../../shared/utils/downloadUtils';
import ApiService from '../../../shared/api/ApiService';
import { ErrorBoundary } from '../../../shared/errors/ErrorBoundary';
import OrderInvoice from '../../../components/common/OrderInvoice';
import InvoiceService from '../../../services/InvoiceService';

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
    warning: {
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.3)',
      icon: `<path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    },
    error: {
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      shadowColor: 'rgba(239, 68, 68, 0.3)',
      icon: `<path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
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

  const existingToasts = document.querySelectorAll('[id^="toast-"]');
  const topOffset = 24 + (existingToasts.length * 80);
  const toast = toastContainer.querySelector(`#${toastId}`);
  if (toast) {
    toast.style.top = `${topOffset}px`;
  }

  document.body.appendChild(toastContainer);

  setTimeout(() => {
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
      toastElement.style.transform = 'translateX(0)';
    }
  }, 100);

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

const OrderHistory = () => {
  const { zoneId, shopId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [error, setError] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [shopData, setShopData] = useState(null);
  const receiptRef = useRef();
  const invoiceRef = useRef();


  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        console.log('📋 OrderHistory: Loading orders for zone shop:', { zoneId, shopId });
        
        // Clear any potential cache conflicts first
        const cacheKeys = [
          `vendor_orders_${shopId}`,
          `zone_orders_${zoneId}`,
          `shop_orders_${shopId}`,
          `orders_${shopId}`
        ];
        
        cacheKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            // Ignore localStorage errors
          }
        });
        
        const response = await ApiService.getOrderHistory(zoneId, shopId, { limit: 500 });
        console.log('📋 OrderHistory: API response:', response);
        
        // Handle the response data structure with better debugging
        const ordersData = response?.data || response || [];
        console.log('📋 OrderHistory: Raw ordersData type and value:', {
          type: typeof ordersData,
          isArray: Array.isArray(ordersData),
          value: ordersData,
          keys: ordersData && typeof ordersData === 'object' ? Object.keys(ordersData) : 'N/A'
        });
        
        // Ensure we have an array before processing
        const safeOrdersData = Array.isArray(ordersData) ? ordersData : [];
        console.log('📋 OrderHistory: Processed orders:', { 
          ordersCount: safeOrdersData.length,
          orders: safeOrdersData,
          allOrderStatuses: safeOrdersData.map(o => ({ id: o.id || o._id, status: o.status })),
          completedCount: safeOrdersData.filter(o => o.status === 'completed').length
        });
        
        setOrders(safeOrdersData);
        setError(null);
      } catch (err) {
        console.error('❌ OrderHistory: Failed to load orders:', err);
        setError('Failed to load order history');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [zoneId, shopId]);

  // Ensure orders is always an array to prevent filter errors
  const safeOrders = Array.isArray(orders) ? orders : [];
  
  const filteredOrders = safeOrders.filter(order => {
    // Since API already returns completed orders, we don't need to filter by status again
    // but keep it as a safety check
    const isCompleted = !order.status || order.status === 'completed';
    
    const orderNumber = order.orderNumber || order.order_number || order.orderNum || order.number || order.id || order._id;
    const searchTerm_lower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                         (orderNumber && orderNumber.toString().toLowerCase().includes(searchTerm_lower)) ||
                         (order.customerName && order.customerName.toLowerCase().includes(searchTerm_lower)) ||
                         (order.tableNumber && order.tableNumber.toString().toLowerCase().includes(searchTerm_lower));
    
    // For status filter, since these are all completed orders, only filter if specifically looking for other statuses
    const matchesStatus = statusFilter === 'all' || statusFilter === 'completed' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.orderTime || order.createdAt || order.timing?.orderPlaced || Date.now());
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
    
    return isCompleted && matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      case 'refunded': return 'bg-yellow-500';
      default: return 'bg-gray-400';
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
    try {
      const dateObj = new Date(date || Date.now());
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const normalizeOrderData = (order) => {
    if (!order || typeof order !== 'object') return null;
    
    // Calculate total from items if not provided
    let calculatedTotal = 0;
    if (Array.isArray(order.items) && order.items.length > 0) {
      calculatedTotal = order.items.reduce((sum, item) => {
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.quantity || 0);
        return sum + (itemPrice * itemQty);
      }, 0);
    }
    
    // Use order.total, order.pricing.total, or calculated total
    const orderTotal = Number(order.total || order.pricing?.total || calculatedTotal || 0);
    
    return {
      id: order.id || order._id || 'unknown',
      _id: order._id || order.id || 'unknown',
      orderNumber: order.orderNumber || order.order_number || order.orderNum || order.number || order.id || order._id || 'N/A',
      customerName: order.customerName || order.customer?.name || 'Unknown Customer',
      customerPhone: order.customerPhone || order.customer?.phone || '',
      tableNumber: order.tableNumber || order.table || '1',
      status: order.status || 'completed',
      orderTime: order.orderTime || order.createdAt || order.timing?.orderPlaced || new Date(),
      completedTime: order.completedTime || order.updatedAt,
      total: orderTotal,
      items: Array.isArray(order.items) ? order.items.map(item => ({
        name: item.name || 'Unknown Item',
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        notes: item.notes || item.specialInstructions || '',
        ...item
      })) : [],
      paymentMethod: order.paymentMethod || order.payment?.method || 'Cash',
      paymentStatus: order.paymentStatus || 'pending',
      cancellationReason: order.cancellationReason,
      ...order
    };
  };

  const handleOrderClick = (order) => {
    const normalizedOrder = normalizeOrderData(order);
    console.log('📝 OrderHistory: Selected order:', { original: order, normalized: normalizedOrder });
    setSelectedOrder(normalizedOrder);
    setShowOrderDetails(true);
  };

  
  const handleDownloadReceipt = () => {
    if (selectedOrder) {
      // Use a short timeout to ensure the component is rendered
      setTimeout(() => {
        downloadPdf(receiptRef.current, `receipt-${selectedOrder.id}.pdf`);
      }, 100);
    }
  };

  // Fetch shop data for invoice generation
  useEffect(() => {
    const fetchShopData = async () => {
      if (!zoneId || !shopId) return;

      try {
        const response = await fetch(`/api/v1/shops/zones/${zoneId}/shop/${shopId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('tableserve_access_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          // Extract the actual shop data from the nested response structure
          const shopData = result.data.shop || result.data;
          console.log('🏪 Shop data received:', shopData);
          setShopData(shopData);
        }
      } catch (error) {
        console.error('Error fetching shop data:', error);
        // Set default shop data if fetch fails
        setShopData({
          name: 'Zone Shop',
          address: 'Shop Address',
          phone: 'Shop Phone',
          email: 'shop@tableserve.com'
        });
      }
    };

    fetchShopData();
  }, [zoneId, shopId]);

  const handleDownloadInvoice = async (order) => {
    try {
      setSelectedOrderForInvoice(order);
      setShowInvoiceModal(true);

      setTimeout(async () => {
        if (invoiceRef.current) {
          await InvoiceService.downloadOrderInvoice(invoiceRef.current, order, {
            filename: `shop-invoice-${order.orderNumber}`
          });
          setShowInvoiceModal(false);
          showToast('success', 'Invoice Downloaded', 'Invoice has been downloaded successfully');
        }
      }, 500);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      showToast('error', 'Download Failed', 'Failed to download invoice. Please try again.');
    }
  };

  const handlePrintInvoice = async (order) => {
    try {
      setSelectedOrderForInvoice(order);
      setShowInvoiceModal(true);

      setTimeout(async () => {
        if (invoiceRef.current) {
          await InvoiceService.printOrderInvoice(invoiceRef.current, order);
          setShowInvoiceModal(false);
          showToast('success', 'Print Initiated', 'Print dialog has been opened');
        }
      }, 500);
    } catch (error) {
      console.error('Error printing invoice:', error);
      showToast('error', 'Print Failed', 'Failed to print invoice. Please try again.');
    }
  };

  if (loading) {
    return (
      <ZoneShopLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-raleway text-gray-500">Loading order history...</p>
        </div>
      </ZoneShopLayout>
    );
  }

  return (
    <ErrorBoundary>
      <ZoneShopLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 font-raleway">{error}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fredoka text-secondary mb-2">Order History</h1>
            <p className="text-secondary font-raleway text-sm sm:text-base">View and manage your past orders</p>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-full font-raleway text-sm flex items-center gap-2 shadow-sm transition-colors font-semibold"
          >
            <FaSyncAlt className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-3xl font-fredoka text-gray-900 mb-1">{safeOrders.filter(o => !o.status || o.status === 'completed').length}</h3>
            <p className="text-gray-500 font-raleway text-sm">Total Completed Orders</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-3xl font-fredoka text-green-600 mb-1">{safeOrders.filter(o => !o.status || o.status === 'completed').length}</h3>
            <p className="text-gray-500 font-raleway text-sm">Completed</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-3xl font-fredoka text-blue-600 mb-1">₹{safeOrders.reduce((sum, o) => {
              const isCompleted = !o.status || o.status === 'completed';
              const normalizedOrder = normalizeOrderData(o);
              const total = normalizedOrder ? normalizedOrder.total : 0;
              return sum + (isCompleted ? total : 0);
            }, 0).toLocaleString('en-IN')}</h3>
            <p className="text-gray-500 font-raleway text-sm">Total Revenue</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, or table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-raleway text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-raleway text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredOrders.map((rawOrder) => {
            const order = normalizeOrderData(rawOrder);
            if (!order) return null;
            
            return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group flex flex-col cursor-pointer"
              onClick={() => handleOrderClick(rawOrder)}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order #{order.orderNumber.toString().slice(-5)}</span>
                  <div className="bg-gray-900 text-white px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-tighter w-fit shadow-sm">
                    Table {order.tableNumber}
                  </div>
                </div>
                <div className={`${getStatusColor(order.status)} text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm`}>
                  {order.status}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-2xl p-3 mb-4 flex items-center gap-3 border border-gray-100/50">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 font-bold">
                  {order.customerName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-gray-800 truncate">{order.customerName}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <FaPhone className="text-[9px]"/> {order.customerPhone || 'No Phone'}
                  </p>
                </div>
              </div>

              {/* Item List */}
              <div className="flex-grow mb-4">
                <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase mb-2 px-1">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>
                <div className="space-y-2">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="grid grid-cols-12 text-sm items-center px-1">
                      <div className="col-span-5 font-medium text-gray-700 truncate text-[13px]">{item.name}</div>
                      <div className="col-span-2 text-center text-gray-600 text-[13px]">₹{(item.price || 0).toFixed(0)}</div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-orange-100 text-orange-700 px-2 py-[2px] rounded text-xs font-bold border border-orange-200 min-w-[28px] text-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="col-span-3 text-right font-semibold text-gray-900 text-[13px]">₹{((item.price || 0) * (item.quantity || 0)).toFixed(0)}</div>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-xs text-gray-400 italic font-medium px-1 pt-1">+{order.items.length - 3} more items...</p>
                  )}
                </div>
              </div>

              {/* Total & Time */}
              <div className="mt-auto mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
                    Total Bill
                  </span>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">
                    ₹{(order.total || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                    <FaClock className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(order.orderTime)}
                  </div>
                  <div className="text-gray-800 text-xs font-semibold">
                    {order.paymentMethod}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 rounded-lg font-raleway text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <FaEye />
                <span>View Full Details</span>
              </button>
            </motion.div>
            );
          })}
        </div>
          
        {filteredOrders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <FaHistory className="text-5xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-gray-700 mb-2">No Completed Orders Found</h3>
            <p className="text-gray-500 font-raleway max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Completed orders will appear here'}
            </p>
          </div>
        )}

        {/* Order Details Modal */}
        <AnimatePresence>
          {showOrderDetails && selectedOrder && (
            <div
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && setShowOrderDetails(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
              >
                <div className="absolute -z-10" style={{ visibility: 'hidden' }}>
                  <Receipt
                    ref={receiptRef}
                    orderDetails={{
                      ...selectedOrder,
                      shop: shopData ? {
                        name: shopData.name,
                        address: shopData.location?.address || shopData.address,
                        phone: shopData.contactInfo?.phone || shopData.phone,
                        email: shopData.contactInfo?.email || shopData.email,
                        gstin: shopData.taxInfo?.gstin || shopData.gstin
                      } : null,
                      shopName: shopData?.name,
                      shopAddress: shopData?.location?.address || shopData?.address,
                      shopPhone: shopData?.contactInfo?.phone || shopData?.phone,
                      shopEmail: shopData?.contactInfo?.email || shopData?.email,
                      shopGstin: shopData?.taxInfo?.gstin || shopData?.gstin,
                      zone: shopData?.zone,
                      zoneName: shopData?.zone?.name || shopData?.zoneName,
                      zoneAddress: shopData?.zone?.address || shopData?.zone?.location || shopData?.zoneAddress,
                      zonePhone: shopData?.zone?.phone || shopData?.zone?.contact?.phone || shopData?.zonePhone
                    }}
                  />
                </div>

                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-xl shrink-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-fredoka text-gray-900">Order #{selectedOrder.orderNumber}</h2>
                    <div className="bg-gray-900 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm uppercase tracking-wider">
                      Table {selectedOrder.tableNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full transition-colors bg-gray-50 hover:bg-gray-100"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto flex-grow">
                  {/* Customer & Status Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FaUser /> Customer Details
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm">
                          <span className="font-bold">{selectedOrder.customerName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-gray-800 font-semibold text-sm">{selectedOrder.customerName}</p>
                          <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                            <FaPhone className="w-3 h-3" /> {selectedOrder.customerPhone}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FaClock /> Order Status
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">Status</span>
                          <span className={`px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase tracking-wide ${getStatusColor(selectedOrder.status)}`}>
                            {selectedOrder.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">Payment</span>
                          <span className="text-gray-800 text-sm font-medium">{selectedOrder.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Refined Items List */}
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Order Items
                    </h3>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="grid grid-cols-12 bg-gray-100 px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="col-span-5">Item</div>
                        <div className="col-span-2 text-center">Price</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-3 text-right">Total</div>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {selectedOrder.items.map((item, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-gray-50 transition"
                          >
                            <div className="col-span-5 font-medium text-gray-800 truncate">
                              {item.name}
                            </div>
                            <div className="col-span-2 text-center text-gray-600">
                              ₹{(item.price || 0).toFixed(2)}
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="bg-orange-100 text-orange-600 px-2 py-[2px] rounded-md text-xs font-semibold">
                                {item.quantity}
                              </span>
                            </div>
                            <div className="col-span-3 text-right font-semibold text-gray-900">
                              ₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center bg-gray-900 px-4 py-3">
                        <span className="text-gray-300 text-sm font-medium">
                          Total Amount
                        </span>
                        <span className="text-lg font-bold text-orange-400">
                          ₹{(selectedOrder.total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Reason */}
                  {selectedOrder.status === 'cancelled' && selectedOrder.cancellationReason && (
                    <div className="mb-6">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cancellation Reason</h3>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 font-medium font-raleway text-sm">{selectedOrder.cancellationReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Receipt Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleDownloadInvoice(selectedOrder)}
                      className="flex-1 bg-white border border-gray-300 text-green-600 hover:bg-green-50 py-2 rounded-lg font-raleway text-sm font-semibold flex items-center justify-center space-x-2 transition-colors"
                    >
                      <FaDownload className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => handlePrintInvoice(selectedOrder)}
                      className="flex-1 bg-white border border-gray-300 text-blue-600 hover:bg-blue-50 py-2 rounded-lg font-raleway text-sm font-semibold flex items-center justify-center space-x-2 transition-colors"
                    >
                      <FaPrint className="w-3 h-3" />
                      <span>Print Receipt</span>
                    </button>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex gap-3 shrink-0 rounded-b-xl">
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2.5 rounded-lg font-raleway text-sm font-bold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Invoice Modal */}
        {showInvoiceModal && selectedOrderForInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
              <OrderInvoice
                ref={invoiceRef}
                orderData={{
                  ...selectedOrderForInvoice,
                  shopName: shopData?.name,
                  shopAddress: shopData?.address,
                  shopPhone: shopData?.phone || shopData?.contact?.phone,
                  shopEmail: shopData?.email || shopData?.contact?.email,
                  zoneName: shopData?.zone?.name,
                  zoneAddress: shopData?.zone?.address,
                  zonePhone: shopData?.zone?.phone
                }}
                businessInfo={{
                  name: shopData?.name || 'Zone Shop',
                  address: shopData?.address || 'Shop Address, Zone Location',
                  phone: shopData?.phone || shopData?.contact?.phone || '+92 XXX XXXXXXX',
                  email: shopData?.email || shopData?.contact?.email || 'shop@tableserve.com',
                  type: 'shop'
                }}
              />
            </div>
          </div>
        )}
      </div>
      </ZoneShopLayout>
    </ErrorBoundary>
  );
};

export default OrderHistory;
