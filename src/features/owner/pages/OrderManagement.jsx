import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetLiveOrdersQuery, useUpdateOrderStatusMutation } from '../../../store/api/ordersApi';
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
  FaPause,
  FaStar,
  FaDownload,
  FaPrint,
  FaSyncAlt
} from 'react-icons/fa';
import SingleRestaurantLayout from '../components/SingleRestaurantLayout';
import simpleTokenService from '../../../shared/auth/SimpleTokenService';
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

const OrderManagement = () => {
  const { restaurantId } = useParams();
  const location = useLocation();
  const { user } = useSelector((state) => state.ui.auth);

  const getViewType = () => {
    if (location.pathname.includes('/orders/live')) return 'live';
    if (location.pathname.includes('/orders/history')) return 'history';
    if (location.pathname.includes('/orders/feedback')) return 'feedback';
    return 'live';
  };

  const viewType = getViewType();

  const [activeTab, setActiveTab] = useState(viewType === 'live' ? 'pending' : 'completed');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState(null);

  const [restaurantData, setRestaurantData] = useState(null);

  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [frozenOrderData, setFrozenOrderData] = useState(null);
  const invoiceRef = useRef(null);

  const {
    data: ordersData,
    error: ordersError,
    isLoading: loading,
    refetch: refetchOrders
  } = useGetLiveOrdersQuery(restaurantId, {
    skip: !restaurantId,
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true
  });

  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  const orders = Array.isArray(ordersData) ? ordersData : [];

  useEffect(() => {
    const token = simpleTokenService.getAccessToken();
    const userData = simpleTokenService.getUserData();
  }, [user, restaurantId]);

  useEffect(() => {
    if (ordersError) {
      console.error('💥 Orders Error Details:', ordersError);
    }
  }, [ordersData, orders, loading, ordersError, restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;

    const joinRoom = () => {
      try {
        if (window.socketService) {
          window.socketService.emit('join_room', {
            roomType: 'restaurant',
            roomId: restaurantId
          });
        }
      } catch (error) {
        console.error('Failed to join restaurant room:', error);
      }
    };

    const leaveRoom = () => {
      try {
        if (window.socketService) {
          window.socketService.emit('leave_room', {
            roomType: 'restaurant',
            roomId: restaurantId
          });
        }
      } catch (error) {
        console.error('Failed to leave restaurant room:', error);
      }
    };

    const handleOrderUpdate = (orderData) => {
      refetchOrders();
    };

    const handleOrderStatusChanged = (statusData) => {
      refetchOrders();
    };

    let unsubscribeOrderUpdate, unsubscribeStatusChanged;

    if (window.socketService) {
      joinRoom();
      unsubscribeOrderUpdate = window.socketService.subscribe('order_update', handleOrderUpdate);
      unsubscribeStatusChanged = window.socketService.subscribe('status_updated', handleOrderStatusChanged);
    }

    return () => {
      if (window.socketService) {
        leaveRoom();
        if (unsubscribeOrderUpdate) unsubscribeOrderUpdate();
        if (unsubscribeStatusChanged) unsubscribeStatusChanged();
      }
    };
  }, [restaurantId, refetchOrders]);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setFeedbackLoading(true);
        const token = simpleTokenService.getAccessToken();

        if (!token) {
          setFeedbackError('Authentication required');
          setFeedback([]);
          setFeedbackLoading(false);
          return;
        }

        const response = await fetch(`/api/orders/restaurants/${restaurantId}/feedback`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch feedback');
        }

        const result = await response.json();
        setFeedback(result.data.feedback || []);
      } catch (err) {
        setFeedbackError(err.message);
        setFeedback([]);
      } finally {
        setFeedbackLoading(false);
      }
    };

    if (restaurantId && activeTab === 'feedback') {
      fetchFeedback();
    }
  }, [restaurantId, activeTab]);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!restaurantId) return;

      try {
        const token = simpleTokenService.getAccessToken();
        if (!token) return;

        const response = await fetch(`/api/v1/restaurants/${restaurantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const restaurantData = result.data.restaurant || result.data;
          setRestaurantData(restaurantData);
        }
      } catch (error) {
        setRestaurantData({
          name: 'Restaurant Name',
          address: 'Restaurant Address',
          phone: 'Restaurant Phone',
          email: 'restaurant@email.com'
        });
      }
    };

    fetchRestaurantData();
  }, [restaurantId]);

  const handleUpdateOrderStatus = async (orderId, newStatus, retryCount = 0) => {
    try {
      const result = await updateOrderStatus({ orderId, status: newStatus }).unwrap();
      showToast('success', 'Order Updated Successfully!', `Order status has been changed to ${newStatus}`);
      refetchOrders();
    } catch (error) {
      const isNetworkError = error?.status === 'FETCH_ERROR' || error?.name === 'TypeError';
      const isServerError = error?.status >= 500;

      if ((isNetworkError || isServerError) && retryCount < 2) {
        setTimeout(() => {
          handleUpdateOrderStatus(orderId, newStatus, retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }

      if (isNetworkError || isServerError) {
        refetchOrders();
        showToast('warning', 'Network Issue Detected', 'Please verify if the order status was updated', 6000);
      } else {
        showToast('error', 'Update Failed', error?.data?.message || error?.message || 'Unknown error occurred');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
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
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];

    return orders.filter(order => {
      if (!order || typeof order !== 'object') return false;
      if (!(order.id || order._id)) return false;

      const safeOrder = {
        ...order,
        total: order.total || order.pricing?.total || 0,
        items: Array.isArray(order.items) ? order.items : [],
        customerName: order.customerName || order.customer?.name || 'Unknown Customer',
        customerPhone: order.customerPhone || order.customer?.phone || '',
        tableNumber: order.tableNumber || '1',
        status: order.status || 'pending'
      };

      if (viewType === 'history') {
        const isCompleted = ['completed', 'delivered'].includes(safeOrder.status?.toLowerCase());
        const matchesSearch = (
          (safeOrder.customerName && safeOrder.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (safeOrder.id && safeOrder.id.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
          (safeOrder._id && safeOrder._id.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
          (safeOrder.tableNumber && safeOrder.tableNumber.toString().includes(searchTerm))
        );
        return isCompleted && matchesSearch;
      }

      const matchesTab = activeTab === 'all' ||
        safeOrder.status === activeTab ||
        (activeTab === 'preparing' && (safeOrder.status === 'confirmed' || safeOrder.status === 'preparing'));
      const matchesSearch = (
        (safeOrder.customerName && safeOrder.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (safeOrder.id && safeOrder.id.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (safeOrder._id && safeOrder._id.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (safeOrder.tableNumber && safeOrder.tableNumber.toString().includes(searchTerm))
      );
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchTerm, viewType]);

  const getOrderCounts = () => {
    if (!Array.isArray(orders)) {
      return { pending: 0, preparing: 0, ready: 0, completed: 0, all: 0 };
    }

    const validOrders = orders.filter(o => o && typeof o === 'object' && (o.id || o._id));

    return {
      pending: validOrders.filter(o => o.status === 'pending').length,
      preparing: validOrders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length,
      ready: validOrders.filter(o => o.status === 'ready').length,
      completed: validOrders.filter(o => o.status === 'completed').length,
      all: validOrders.length
    };
  };

  const orderCounts = getOrderCounts();

  const normalizeOrderData = (order) => {
    if (!order || typeof order !== 'object') return null;

    const extractOrderNumber = (order) => {
      return order.orderNumber || order.order_number || order.orderNum || order.number || `ORD-${order.id || order._id || 'UNKNOWN'}`;
    };

    const extractRestaurantData = (order) => {
      const restaurant = order.restaurant || order.restaurantId;
      if (restaurant && typeof restaurant === 'object' && restaurant.name) {
        let addressStr = '';
        if (restaurant.contact?.address) {
          const addr = restaurant.contact.address;
          const parts = [];
          if (addr.street) parts.push(addr.street);
          if (addr.city) parts.push(addr.city);
          if (addr.state) parts.push(addr.state);
          if (addr.zipCode) parts.push(addr.zipCode);
          addressStr = parts.join(', ');
        }
        return {
          name: restaurant.name,
          address: addressStr || restaurant.address || '',
          phone: restaurant.phone || restaurant.contact?.phone || '',
          email: restaurant.email || restaurant.contact?.email || ''
        };
      }
      return null;
    };

    const restaurantData = extractRestaurantData(order);

    return {
      id: order.id || order._id || 'unknown',
      _id: order._id || order.id || 'unknown',
      orderNumber: extractOrderNumber(order),
      tableNumber: order.tableNumber || '1',
      status: order.status || 'pending',
      customerName: order.customerName || order.customer?.name || 'Unknown Customer',
      customerPhone: order.customerPhone || order.customer?.phone || '',
      orderTime: order.orderTime || order.createdAt || order.timing?.orderPlaced || new Date(),
      total: order.total || order.pricing?.total || 0,
      items: Array.isArray(order.items) ? order.items.map(item => ({
        name: item.name || 'Unknown Item',
        quantity: item.quantity || 1,
        price: item.price || 0,
        ...item
      })) : [],
      specialInstructions: order.specialInstructions || '',
      restaurant: restaurantData,
      restaurantId: order.restaurantId,
      ...order
    };
  };

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

  if (ordersError) {
    return (
      <SingleRestaurantLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaTimes className="text-red-500 text-2xl" />
            </div>
            <h3 className="text-xl font-fredoka text-gray-900 mb-2">Error Loading Orders</h3>
            <p className="text-gray-600 font-raleway mb-4">
              {ordersError?.message || 'Failed to load orders'}
            </p>
            <button
              onClick={() => refetchOrders()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-raleway"
            >
              Try Again
            </button>
          </div>
        </div>
      </SingleRestaurantLayout>
    );
  }

  const handleDownloadInvoice = async (order) => {
    try {
      const normalizedOrder = normalizeOrderData(order);
      setFrozenOrderData(normalizedOrder);
      setSelectedOrderForInvoice(normalizedOrder);
      setShowInvoiceModal(true);

      setTimeout(async () => {
        if (invoiceRef.current) {
          const restaurantInfo = normalizedOrder.restaurant || {
            name: restaurantData?.name || 'Restaurant Name',
            address: restaurantData?.contact?.address ?
              `${restaurantData.contact.address.street}, ${restaurantData.contact.address.city}, ${restaurantData.contact.address.state} ${restaurantData.contact.address.zipCode}` :
              restaurantData?.address || 'Restaurant Address',
            phone: restaurantData?.contact?.phone || restaurantData?.phone || 'Restaurant Phone',
            email: restaurantData?.contact?.email || restaurantData?.email || 'restaurant@email.com'
          };

          await InvoiceService.downloadOrderInvoice(invoiceRef.current, normalizedOrder, {
            filename: `restaurant-invoice-${normalizedOrder.orderNumber}`
          });

          setShowInvoiceModal(false);
          setFrozenOrderData(null);
        }
      }, 500);
    } catch (error) {
      showToast('error', 'Download Failed', 'Failed to download invoice. Please try again.');
      setFrozenOrderData(null);
    }
  };

  const handlePrintInvoice = async (order) => {
    try {
      const normalizedOrder = normalizeOrderData(order);
      setFrozenOrderData(normalizedOrder);
      setSelectedOrderForInvoice(normalizedOrder);
      setShowInvoiceModal(true);

      setTimeout(async () => {
        if (invoiceRef.current) {
          await InvoiceService.printOrderInvoice(invoiceRef.current, normalizedOrder);
          setShowInvoiceModal(false);
          setFrozenOrderData(null);
        }
      }, 500);
    } catch (error) {
      showToast('error', 'Print Failed', 'Failed to print invoice. Please try again.');
      setFrozenOrderData(null);
    }
  };

  const renderFeedback = () => {
    if (feedbackLoading) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 spinner-theme rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-theme-text-primary font-raleway">Loading feedback...</p>
        </div>
      );
    }

    if (feedbackError) {
      return (
        <div className="text-center py-12">
          <FaBell className="w-16 h-16 text-theme-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">Error Loading Feedback</h3>
          <p className="text-theme-text-secondary font-raleway">{feedbackError}</p>
        </div>
      );
    }

    if (feedback.length === 0) {
      return (
        <div className="text-center py-12">
          <FaBell className="w-16 h-16 text-theme-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Customer Feedback</h3>
          <p className="text-theme-text-secondary font-raleway">Customer reviews and feedback will appear here.</p>
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
                  Order #{item.orderNumber} • Table {item.tableNumber}
                </p>
                <p className="text-theme-text-tertiary font-raleway text-xs">Phone: {item.customerPhone}</p>
              </div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                ))}
                <span className="ml-2 text-sm font-medium text-theme-text-primary">{item.rating}/5</span>
              </div>
            </div>
            <p className="text-theme-text-primary font-raleway mb-4">{item.comment}</p>
            <div className="flex justify-between items-center text-sm text-theme-text-tertiary">
              <span>Submitted: {new Date(item.submittedAt).toLocaleDateString()}</span>
              <span>Order Date: {new Date(item.orderDate).toLocaleDateString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <SingleRestaurantLayout>
      <div className="p-4 sm:p-6 lg:p-8">

        {/* Header - Added Softer Styles and Pending Counter Indicator */}
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
            {viewType === 'live' && (
              <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] px-4 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-sm font-raleway text-sm">
                <div className="w-2.5 h-2.5 bg-[#f59e0b] rounded-full animate-pulse"></div>
                {orderCounts.pending} Pending Orders
              </div>
            )}
            <button
              onClick={() => refetchOrders()}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-full font-raleway text-sm flex items-center gap-2 shadow-sm transition-colors font-semibold"
            >
              <FaSyncAlt className="w-3 h-3" /> Refresh
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

          {viewType === 'live' && (
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
          )}

          {viewType === 'history' && (
            <div className="bg-theme-bg-secondary rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-fredoka text-theme-text-primary">Order History</h3>
                  <p className="text-theme-text-secondary font-raleway text-sm">Showing completed orders only</p>
                </div>
                <div className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <span className="font-fredoka text-xl">{orderCounts.completed}</span>
                  <span className="font-raleway text-sm">Completed</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {viewType === 'feedback' ? (
          renderFeedback()
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((orderData) => {
              const order = normalizeOrderData(orderData);
              if (!order) return null;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="admin-card rounded-2xl p-6 hover:border-theme-accent-primary/30 transition-all duration-300 flex flex-col bg-white border border-gray-100 shadow-sm"
                >
                  {/* Order Header - Black Table Number Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col items-start gap-2">
                      <h3 className="text-lg font-fredoka text-gray-800">#{order.orderNumber}</h3>
                      <div className="flex items-center space-x-1.5 bg-gray-900 text-white px-3 py-1 rounded shadow-sm">
                        <span className="font-bold text-xs tracking-wider uppercase">Table {order.tableNumber}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wide shadow-sm ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <FaUser className="text-gray-400 w-3 h-3" />
                      <span className="text-gray-800 font-raleway text-sm font-medium">{order.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FaPhone className="text-gray-400 w-3 h-3" />
                      <span className="text-gray-500 font-raleway text-sm">{order.customerPhone}</span>
                    </div>
                  </div>

                  {/* Food Items - Scannable with Colored Quantity */}
                 {/* Food Items - Clean Single-Line Billing Style */}
{/* Food Items - Billing Style with Total */}
<div className="mb-4 flex-grow">
  <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
    <h4 className="text-gray-600 font-raleway text-xs font-bold uppercase tracking-wider">
      Order Details
    </h4>
  </div>

  {/* HEADER */}
  <div className="grid grid-cols-12 text-[10px] text-gray-400 font-semibold uppercase mb-1 px-1">
    <div className="col-span-5">Item</div>
    <div className="col-span-2 text-center">Price</div>
    <div className="col-span-2 text-center">Qty</div>
    <div className="col-span-3 text-right">Total</div>
  </div>

  <div className="space-y-2">
    {order.items.slice(0, 3).map((item, index) => (
      <div
        key={index}
        className="grid grid-cols-12 items-center text-sm px-1"
      >
        {/* Item Name */}
        <div className="col-span-5 text-gray-800 font-medium truncate">
          {item.name}
        </div>

        {/* Price */}
        <div className="col-span-2 text-center text-gray-600">
          ₹{(item.price || 0).toFixed(0)}
        </div>

        {/* Qty */}
        <div className="col-span-2 flex justify-center">
          <span className="bg-orange-100 text-orange-700 px-2 py-[2px] rounded text-xs font-bold border border-orange-200 min-w-[28px] text-center">
            {item.quantity}
          </span>
        </div>

        {/* Total Price */}
        <div className="col-span-3 text-right text-gray-900 font-semibold">
          ₹{((item.price || 0) * (item.quantity || 0)).toFixed(0)}
        </div>
      </div>
    ))}

    {order.items.length > 3 && (
      <p className="text-gray-400 font-raleway text-xs font-medium pt-1 italic">
        +{order.items.length - 3} more items...
      </p>
    )}
  </div>
</div>

                {/* Footer Stats - Enhanced */}
<div className="mb-5 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">

  {/* TOTAL SECTION (highlighted) */}
  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">
      Total Bill
    </span>
    <span className="text-xl font-bold text-gray-900 tracking-tight">
      ₹{(order.total || 0).toFixed(2)}
    </span>
  </div>

  {/* TIME SECTION */}
  <div className="flex justify-between items-center pt-3">
    
    {/* Left: Relative Time */}
    <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
      <FaClock className="w-3.5 h-3.5 text-gray-400" />
      {getTimeAgo(order.orderTime)}
    </div>

    {/* Right: Exact Time */}
    <div className="text-gray-800 text-xs font-semibold">
      {formatTime(order.orderTime)}
    </div>

  </div>
</div>

                  {/* Actions */}
                  <div className="space-y-2 mt-auto">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderModal(true);
                      }}
                      className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 rounded-lg font-raleway text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
                    >
                      <FaEye />
                      <span>View Full Details</span>
                    </button>

                    {viewType === 'live' && order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order._id, 'confirmed')}
                            className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white py-2 rounded-lg font-raleway text-sm font-semibold transition-colors"
                          >
                            Accept Order
                          </button>
                        )}

                        {(order.status === 'confirmed' || order.status === 'preparing') && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order._id, 'ready')}
                            className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white py-2 rounded-lg font-raleway text-sm font-semibold transition-colors"
                          >
                            Mark Ready
                          </button>
                        )}

                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order._id, 'completed')}
                            className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-2 rounded-lg font-raleway text-sm font-semibold transition-colors"
                          >
                            Complete
                          </button>
                        )}

                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order._id, 'cancelled')}
                            className="flex-1 bg-white border border-red-200 text-red-500 hover:bg-red-50 py-2 rounded-lg font-raleway text-sm font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            }).filter(Boolean)}
          </div>
        )}

        {viewType !== 'feedback' && filteredOrders.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <FaUtensils className="text-5xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-gray-700 mb-2">
              {viewType === 'history' ? 'No Completed Orders' : 'No Orders Found'}
            </h3>
            <p className="text-gray-500 font-raleway max-w-sm mx-auto">
              {viewType === 'history' ?
                (searchTerm ? 'No completed orders match your search criteria.' : 'Completed orders will appear here for your records.') :
                (searchTerm ? 'No orders match your search criteria.' : 'Waiting for new orders to arrive...')
              }
            </p>
          </div>
        )}

        {/* Order Details Modal - Refined, Smaller UX */}
        {showOrderModal && selectedOrder && (() => {
          const safeSelectedOrder = normalizeOrderData(selectedOrder);
          if (!safeSelectedOrder) {
            setShowOrderModal(false);
            return null;
          }

          return (
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-xl shrink-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-fredoka text-gray-900">Order #{safeSelectedOrder.orderNumber}</h2>
                    <div className="bg-gray-900 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm uppercase tracking-wider">
                      Table {safeSelectedOrder.tableNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOrderModal(false)}
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
                          <span className="font-bold">{safeSelectedOrder.customerName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-gray-800 font-semibold text-sm">{safeSelectedOrder.customerName}</p>
                          <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                            <FaPhone className="w-3 h-3" /> {safeSelectedOrder.customerPhone}
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
                          <span className={`px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase tracking-wide ${getStatusColor(safeSelectedOrder.status)}`}>
                            {getStatusText(safeSelectedOrder.status)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">Time Placed</span>
                          <span className="text-gray-800 text-sm font-medium">{formatTime(safeSelectedOrder.orderTime)}</span>
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

    {/* HEADER ROW */}
    <div className="grid grid-cols-12 bg-gray-100 px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
      <div className="col-span-5">Item</div>
      <div className="col-span-2 text-center">Price</div>
      <div className="col-span-2 text-center">Qty</div>
      <div className="col-span-3 text-right">Total</div>
    </div>

    {/* ITEMS */}
    <div className="divide-y divide-gray-100">
      {safeSelectedOrder.items.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-gray-50 transition"
        >
          {/* Item Name */}
          <div className="col-span-5 font-medium text-gray-800 truncate">
            {item.name}
          </div>

          {/* Price */}
          <div className="col-span-2 text-center text-gray-600">
            ₹{(item.price || 0).toFixed(2)}
          </div>

          {/* Qty */}
          <div className="col-span-2 text-center">
            <span className="bg-orange-100 text-orange-600 px-2 py-[2px] rounded-md text-xs font-semibold">
              {item.quantity}
            </span>
          </div>

          {/* Total */}
          <div className="col-span-3 text-right font-semibold text-gray-900">
            ₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
          </div>
        </div>
      ))}
    </div>

    {/* TOTAL BAR */}
    <div className="flex justify-between items-center bg-gray-900 px-4 py-3">
      <span className="text-gray-300 text-sm font-medium">
        Total Amount
      </span>
      <span className="text-lg font-bold text-orange-400">
        ₹{(safeSelectedOrder.total || 0).toFixed(2)}
      </span>
    </div>
  </div>
</div>

                  {safeSelectedOrder.specialInstructions && (
                    <div className="mb-6">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chef Notes</h3>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 font-medium font-raleway text-sm italic">"{safeSelectedOrder.specialInstructions}"</p>
                      </div>
                    </div>
                  )}

                  {/* Receipt Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleDownloadInvoice(safeSelectedOrder)}
                      className="flex-1 bg-white border border-gray-300 text-green-600 hover:bg-green-50 py-2 rounded-lg font-raleway text-sm font-semibold flex items-center justify-center space-x-2 transition-colors"
                    >
                      <FaDownload className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => handlePrintInvoice(safeSelectedOrder)}
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
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-2.5 rounded-lg font-raleway text-sm font-bold transition-colors"
                  >
                    Close
                  </button>

                  {safeSelectedOrder.status === 'pending' && (
                    <button
                      onClick={() => {
                        handleUpdateOrderStatus(safeSelectedOrder._id, 'confirmed');
                        setShowOrderModal(false);
                      }}
                      className="flex-[2] bg-[#10B981] hover:bg-[#059669] text-white py-2.5 rounded-lg font-raleway text-sm font-bold transition-colors"
                    >
                      Accept Order
                    </button>
                  )}

                  {(safeSelectedOrder.status === 'confirmed' || safeSelectedOrder.status === 'preparing') && (
                    <button
                      onClick={() => {
                        handleUpdateOrderStatus(safeSelectedOrder._id, 'ready');
                        setShowOrderModal(false);
                      }}
                      className="flex-[2] bg-[#3B82F6] hover:bg-[#2563EB] text-white py-2.5 rounded-lg font-raleway text-sm font-bold transition-colors"
                    >
                      Mark Food as Ready
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* Invoice Modal */}
        {showInvoiceModal && frozenOrderData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
              <OrderInvoice
                ref={invoiceRef}
                orderData={frozenOrderData}
                businessInfo={frozenOrderData.restaurant || {
                  name: restaurantData?.name || 'Restaurant Name',
                  address: restaurantData?.contact?.address ?
                    `${restaurantData.contact.address.street}, ${restaurantData.contact.address.city}, ${restaurantData.contact.address.state} ${restaurantData.contact.address.zipCode}` :
                    restaurantData?.address || 'Restaurant Address, City',
                  phone: restaurantData?.contact?.phone || restaurantData?.phone || '+92 XXX XXXXXXX',
                  email: restaurantData?.contact?.email || restaurantData?.email || 'restaurant@tableserve.com',
                  type: 'restaurant'
                }}
              />
            </div>
          </div>
        )}

      </div>
    </SingleRestaurantLayout>
  );
};

export default OrderManagement;