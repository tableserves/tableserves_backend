import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  FaShoppingCart,
  FaClock,
  FaCheck,
  FaUser,
  FaPhone,
  FaEye,
  FaTimes,
  FaDownload,
  FaPrint,
  FaSyncAlt,
  FaSearch,
  FaUtensils,
  FaExclamationTriangle
} from 'react-icons/fa';
import ZoneShopLayout from '../pages/ZoneShopLayout';
import { useGetLiveOrdersQuery, useUpdateOrderStatusMutation } from '../../../store/api/ordersApi';
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

const LiveOrders = () => {
  const { zoneId, shopId } = useParams();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [shopData, setShopData] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [frozenOrderData, setFrozenOrderData] = useState(null);
  const invoiceRef = useRef();

  // RTK Query
  const {
    data: ordersData,
    isLoading: loading,
    error: ordersError,
    refetch,
    isFetching
  } = useGetLiveOrdersQuery({
    role: 'zone_shop',
    entityId: shopId,
    limit: 100
  });

  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const orders = Array.isArray(ordersData) ? ordersData : [];

  // ===== New-order sound notification =====
  // Mirrors what the restaurant side does in RestaurantOrderNotifications.jsx —
  // when a previously-unseen pending order shows up, ring a rising 3-tone Web Audio
  // alert so the shop owner notices even if they aren't looking at the screen.
  // We use the Web Audio API (no MP3 needed) — same frequencies as the restaurant.
  const audioContextRef = useRef(null);
  const seenOrderIdsRef = useRef(null); // Set<string>; null = "first render, just seed it"

  const playNewOrderSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      // Some browsers suspend AudioContext until the user interacts with the page —
      // best effort resume here; if it stays suspended the sound is just silently skipped.
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      [800, 1000, 1200].forEach((frequency, index) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
        }, index * 200);
      });
    } catch (err) {
      // Non-fatal — sound is a nice-to-have, never break the page
      console.warn('Could not play new-order sound:', err);
    }
  };

  useEffect(() => {
    // First time we receive orders, just remember them — don't ring on initial load.
    if (seenOrderIdsRef.current === null) {
      seenOrderIdsRef.current = new Set(orders.map(o => o.id || o._id).filter(Boolean));
      return;
    }
    // Detect orders that weren't there last poll AND are still pending (= newly placed).
    const newPendingIds = [];
    for (const o of orders) {
      const id = o.id || o._id;
      if (!id) continue;
      if (!seenOrderIdsRef.current.has(id) && (o.status === 'pending' || !o.status)) {
        newPendingIds.push(id);
      }
    }
    // Update the seen-set with EVERY current id so updates don't keep re-triggering.
    seenOrderIdsRef.current = new Set(orders.map(o => o.id || o._id).filter(Boolean));

    if (newPendingIds.length > 0) {
      playNewOrderSound();
      showToast('success', 'New Order!', `${newPendingIds.length} new order${newPendingIds.length === 1 ? '' : 's'} received`);
    }
  }, [orders]);

  // Helper: Normalize Order Data
  const normalizeOrderData = (order) => {
    if (!order) return null;
    
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
      id: order.id || order._id,
      orderNumber: order.orderNumber || `ORD-${order.id?.slice(-5)}`,
      tableNumber: order.tableNumber || 'N/A',
      status: order.status || 'pending',
      customerName: order.customer?.name || order.customerName || 'Guest Customer',
      customerPhone: order.customer?.phone || order.customerPhone || 'No Phone',
      orderTime: order.orderTime || order.createdAt || new Date(),
      total: orderTotal,
      items: Array.isArray(order.items) ? order.items.map(item => ({
        name: item.name || 'Unknown Item',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        ...item
      })) : [],
      specialInstructions: order.specialInstructions || '',
      ...order
    };
  };

  // Status Styling
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': 
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status) => {
    if (status === 'preparing' || status === 'confirmed') return 'Preparing';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const order = normalizeOrderData(o);
      const matchesTab = activeTab === 'all' || 
                        (activeTab === 'preparing' ? (order.status === 'confirmed' || order.status === 'preparing') : order.status === activeTab);
      const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            order.tableNumber.toString().includes(searchTerm);
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchTerm]);

  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }), [orders]);

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const getTimeAgo = (date) => {
    const mins = Math.floor((new Date() - new Date(date)) / 60000);
    return mins < 1 ? 'Just now' : `${mins}m ago`;
  };

  const handleDownloadInvoice = async (order) => {
    try {
      const normalizedOrder = normalizeOrderData(order);
      setFrozenOrderData(normalizedOrder);
      setShowInvoiceModal(true);

      setTimeout(async () => {
        if (invoiceRef.current) {
          await InvoiceService.downloadOrderInvoice(invoiceRef.current, normalizedOrder, {
            filename: `zoneshop-invoice-${normalizedOrder.orderNumber}`
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

  const handleUpdateStatus = async (orderId, newStatus, retryCount = 0) => {
    try {
      await updateOrderStatus({ orderId, status: newStatus }).unwrap();
      showToast('success', 'Order Updated Successfully!', `Order status has been changed to ${newStatus}`);
      refetch();
    } catch (error) {
      const isNetworkError = error?.status === 'FETCH_ERROR' || error?.name === 'TypeError';
      const isServerError = error?.status >= 500;

      if ((isNetworkError || isServerError) && retryCount < 2) {
        setTimeout(() => {
          handleUpdateStatus(orderId, newStatus, retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }

      if (isNetworkError || isServerError) {
        refetch();
        showToast('warning', 'Network Issue Detected', 'Please verify if the order status was updated', 6000);
      } else {
        showToast('error', 'Update Failed', error?.data?.message || error?.message || 'Unknown error occurred');
      }
    }
  };

  if (loading) return (
    <ZoneShopLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="font-raleway text-theme-text-secondary">Syncing Live Orders...</p>
        </div>
    </ZoneShopLayout>
  );

  return (
    <ErrorBoundary>
      <ZoneShopLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-fredoka text-theme-text-primary mb-2">Live Orders</h1>
              <p className="text-theme-text-secondary font-raleway text-sm sm:text-base">Monitor and manage incoming orders</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-status-warning-light border border-status-warning/20 text-status-warning px-4 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-sm font-raleway text-sm">
                <div className="w-2.5 h-2.5 bg-status-warning rounded-full animate-pulse"></div>
                {counts.pending} Pending Orders
              </div>
              <button 
                onClick={() => refetch()}
                className="bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary hover:bg-theme-bg-hover px-4 py-2.5 rounded-full font-raleway text-sm flex items-center gap-2 shadow-sm transition-colors font-semibold"
              >
                <FaSyncAlt className={isFetching ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* SEARCH & TABS */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary" />
              <input
                type="text"
                placeholder="Search by customer name, order ID, or table number..."
                className="w-full pl-10 pr-4 py-3 bg-theme-bg-secondary border border-theme-border-primary rounded-lg focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all shadow-sm text-theme-text-primary placeholder:text-theme-text-tertiary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Orders', count: counts.all },
                { key: 'pending', label: 'Pending', count: counts.pending },
                { key: 'preparing', label: 'Preparing', count: counts.preparing },
                { key: 'ready', label: 'Ready', count: counts.ready },
                { key: 'completed', label: 'Completed', count: counts.completed },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg font-raleway text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.key 
                    ? 'bg-accent text-white shadow-md' 
                    : 'bg-theme-bg-secondary text-theme-text-primary border border-theme-border-primary hover:bg-theme-bg-hover'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-theme-bg-tertiary text-theme-text-secondary'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ORDERS GRID — match restaurant OrderManagement: max 3 columns on xl screens
              so each card has enough breathing room. The previous 4-column-on-2xl grid
              made the cards visibly cramped on wider monitors. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map((rawOrder) => {
              const order = normalizeOrderData(rawOrder);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={order.id}
                  className="bg-theme-bg-secondary border border-theme-border-primary rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-accent/30 transition-all group flex flex-col"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-theme-text-tertiary uppercase tracking-widest">Order #{order.orderNumber.slice(-5)}</span>
                      <div className="bg-theme-text-primary text-theme-bg-primary px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-tighter w-fit shadow-sm">
                        Table {order.tableNumber}
                      </div>
                    </div>
                    <div className={`${getStatusColor(order.status)} text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm`}>
                      {getStatusText(order.status)}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-theme-bg-tertiary rounded-2xl p-3 mb-4 flex items-center gap-3 border border-theme-border-secondary">
                    <div className="w-10 h-10 rounded-full bg-theme-bg-secondary flex items-center justify-center shadow-sm text-accent font-bold">
                        {order.customerName.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-theme-text-primary truncate">{order.customerName}</p>
                      <p className="text-[11px] text-theme-text-secondary flex items-center gap-1"><FaPhone className="text-[9px]"/> {order.customerPhone}</p>
                    </div>
                  </div>

                  {/* Item List (Billing Style) */}
                  <div className="flex-grow mb-4">
                    <div className="grid grid-cols-12 text-[10px] font-bold text-theme-text-tertiary uppercase mb-2 px-1">
                      <div className="col-span-5">Item</div>
                      <div className="col-span-2 text-center">Price</div>
                      <div className="col-span-2 text-center">Qty</div>
                      <div className="col-span-3 text-right">Total</div>
                    </div>
                    <div className="space-y-2">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="grid grid-cols-12 text-sm items-center px-1">
                          <div className="col-span-5 font-medium text-theme-text-primary truncate text-[13px]">{item.name}</div>
                          <div className="col-span-2 text-center text-theme-text-secondary text-[13px]">₹{(item.price || 0).toFixed(0)}</div>
                          <div className="col-span-2 flex justify-center">
                            <span className="bg-status-warning-light text-status-warning px-2 py-[2px] rounded text-xs font-bold border border-status-warning/20 min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="col-span-3 text-right font-semibold text-theme-text-primary text-[13px]">₹{((item.price || 0) * (item.quantity || 0)).toFixed(0)}</div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-theme-text-tertiary italic font-medium px-1 pt-1">+{order.items.length - 3} more items...</p>
                      )}
                    </div>
                  </div>

                  {/* Total & Time */}
                  <div className="mt-auto mb-4 bg-theme-bg-tertiary p-4 rounded-xl border border-theme-border-primary shadow-sm">
                    {/* TOTAL SECTION */}
                    <div className="flex justify-between items-center pb-3 border-b border-theme-border-secondary">
                      <span className="text-theme-text-secondary text-xs font-semibold uppercase tracking-wide">
                        Total Bill
                      </span>
                      <span className="text-xl font-bold text-theme-text-primary tracking-tight">
                        ₹{(order.total || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* TIME SECTION */}
                    <div className="flex justify-between items-center pt-3">
                      <div className="flex items-center gap-1.5 text-theme-text-secondary text-xs font-medium">
                        <FaClock className="w-3.5 h-3.5 text-theme-text-tertiary" />
                        {getTimeAgo(order.orderTime)}
                      </div>
                      <div className="text-theme-text-primary text-xs font-semibold">
                        {formatTime(order.orderTime)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 mt-auto">
                    <button 
                      onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                      className="w-full bg-theme-bg-secondary border border-theme-border-primary text-theme-text-primary hover:bg-theme-bg-hover py-2 rounded-lg font-raleway text-sm font-semibold transition-colors flex items-center justify-center space-x-2"
                    >
                      <FaEye />
                      <span>View Full Details</span>
                    </button>
                    
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="flex space-x-2">
                        {order.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                            className="flex-1 bg-status-success hover:bg-status-success/90 text-white py-2 rounded-lg font-raleway text-sm font-semibold transition-colors shadow-sm"
                          >
                            Accept Order
                          </button>
                        )}

                        {(order.status === 'confirmed' || order.status === 'preparing') && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'ready')}
                            className="flex-1 bg-status-info hover:bg-status-info/90 text-white py-2 rounded-lg font-raleway text-sm font-semibold transition-colors shadow-sm"
                          >
                            Mark Ready
                          </button>
                        )}

                        {order.status === 'ready' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'completed')}
                            className="flex-1 bg-theme-text-primary hover:bg-theme-text-primary/90 text-theme-bg-primary py-2 rounded-lg font-raleway text-sm font-semibold transition-colors shadow-sm"
                          >
                            Complete
                          </button>
                        )}

                        {order.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                            className="flex-1 bg-theme-bg-secondary border border-status-error/30 text-status-error hover:bg-status-error-light py-2 rounded-lg font-raleway text-sm font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* EMPTY STATE */}
          {filteredOrders.length === 0 && (
            <div className="text-center py-16 bg-theme-bg-secondary rounded-2xl border border-dashed border-theme-border-primary">
              <FaUtensils className="text-5xl text-theme-text-tertiary mx-auto mb-4" />
              <h3 className="text-xl font-fredoka text-theme-text-primary mb-2">No Orders Found</h3>
              <p className="text-theme-text-secondary font-raleway max-w-sm mx-auto">
                {searchTerm ? 'No orders match your search criteria.' : 'Waiting for new orders to arrive...'}
              </p>
            </div>
          )}

          {/* DETAILS MODAL */}
          <AnimatePresence>
            {showOrderModal && selectedOrder && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowOrderModal(false)}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-theme-bg-primary rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-theme-border-primary"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="px-5 py-4 border-b border-theme-border-primary flex items-center justify-between bg-theme-bg-secondary rounded-t-xl shrink-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-fredoka text-theme-text-primary">Order #{selectedOrder.orderNumber}</h2>
                      <div className="bg-theme-text-primary text-theme-bg-primary px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm uppercase tracking-wider">
                        Table {selectedOrder.tableNumber}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowOrderModal(false)}
                      className="text-theme-text-tertiary hover:text-theme-text-primary p-1.5 rounded-full transition-colors bg-theme-bg-tertiary hover:bg-theme-bg-hover"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 overflow-y-auto flex-grow">
                    {/* Customer & Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-theme-bg-secondary border border-theme-border-primary rounded-lg p-4">
                        <h3 className="text-xs font-bold text-theme-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FaUser /> Customer Details
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm">
                            <span className="font-bold">{selectedOrder.customerName.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-theme-text-primary font-semibold text-sm">{selectedOrder.customerName}</p>
                            <p className="text-theme-text-secondary text-xs flex items-center gap-1 mt-0.5">
                              <FaPhone className="w-3 h-3" /> {selectedOrder.customerPhone}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-theme-bg-secondary border border-theme-border-primary rounded-lg p-4">
                        <h3 className="text-xs font-bold text-theme-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FaClock /> Order Status
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-theme-text-secondary text-xs">Status</span>
                            <span className={`px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase tracking-wide ${getStatusColor(selectedOrder.status)}`}>
                              {getStatusText(selectedOrder.status)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-theme-text-secondary text-xs">Time Placed</span>
                            <span className="text-theme-text-primary text-sm font-medium">{formatTime(selectedOrder.orderTime)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Refined Items List */}
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wider mb-3">
                        Order Items
                      </h3>

                      <div className="bg-theme-bg-secondary border border-theme-border-primary rounded-xl overflow-hidden shadow-sm">
                        {/* HEADER ROW */}
                        <div className="grid grid-cols-12 bg-theme-bg-tertiary px-4 py-2 text-[11px] font-semibold text-theme-text-secondary uppercase tracking-wide">
                          <div className="col-span-5">Item</div>
                          <div className="col-span-2 text-center">Price</div>
                          <div className="col-span-2 text-center">Qty</div>
                          <div className="col-span-3 text-right">Total</div>
                        </div>

                        {/* ITEMS */}
                        <div className="divide-y divide-theme-border-secondary">
                          {selectedOrder.items.map((item, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-theme-bg-hover transition"
                            >
                              <div className="col-span-5 font-medium text-theme-text-primary truncate">
                                {item.name}
                              </div>
                              <div className="col-span-2 text-center text-theme-text-secondary">
                                ₹{(item.price || 0).toFixed(2)}
                              </div>
                              <div className="col-span-2 text-center">
                                <span className="bg-status-warning-light text-status-warning px-2 py-[2px] rounded-md text-xs font-semibold border border-status-warning/20">
                                  {item.quantity}
                                </span>
                              </div>
                              <div className="col-span-3 text-right font-semibold text-theme-text-primary">
                                ₹{((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* TOTAL BAR */}
                        <div className="flex justify-between items-center bg-theme-text-primary px-4 py-3">
                          <span className="text-theme-bg-primary/70 text-sm font-medium">
                            Total Amount
                          </span>
                          <span className="text-lg font-bold text-accent">
                            ₹{(selectedOrder.total || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedOrder.specialInstructions && (
                      <div className="mb-6">
                        <h3 className="text-xs font-bold text-theme-text-tertiary uppercase tracking-wider mb-2">Chef Notes</h3>
                        <div className="p-3 bg-status-warning-light border border-status-warning/30 rounded-lg">
                          <p className="text-status-warning font-medium font-raleway text-sm italic">"{selectedOrder.specialInstructions}"</p>
                        </div>
                      </div>
                    )}

                    {/* Receipt Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleDownloadInvoice(selectedOrder)}
                        className="flex-1 bg-theme-bg-secondary border border-theme-border-primary text-status-success hover:bg-status-success-light py-2 rounded-lg font-raleway text-sm font-semibold flex items-center justify-center space-x-2 transition-colors"
                      >
                        <FaDownload className="w-3 h-3" />
                        <span>Download PDF</span>
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(selectedOrder)}
                        className="flex-1 bg-theme-bg-secondary border border-theme-border-primary text-status-info hover:bg-status-info-light py-2 rounded-lg font-raleway text-sm font-semibold flex items-center justify-center space-x-2 transition-colors"
                      >
                        <FaPrint className="w-3 h-3" />
                        <span>Print Receipt</span>
                      </button>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="px-5 py-3 bg-theme-bg-secondary border-t border-theme-border-primary flex gap-3 shrink-0 rounded-b-xl">
                    <button
                      onClick={() => setShowOrderModal(false)}
                      className="flex-1 bg-theme-bg-primary border border-theme-border-primary hover:bg-theme-bg-hover text-theme-text-primary py-2.5 rounded-lg font-raleway text-sm font-bold transition-colors"
                    >
                      Close
                    </button>

                    {selectedOrder.status === 'pending' && (
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedOrder.id, 'confirmed');
                          setShowOrderModal(false);
                        }}
                        className="flex-[2] bg-status-success hover:bg-status-success/90 text-white py-2.5 rounded-lg font-raleway text-sm font-bold transition-colors shadow-sm"
                      >
                        Accept Order
                      </button>
                    )}

                    {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'preparing') && (
                      <button
                        onClick={() => {
                          handleUpdateStatus(selectedOrder.id, 'ready');
                          setShowOrderModal(false);
                        }}
                        className="flex-[2] bg-status-info hover:bg-status-info/90 text-white py-2.5 rounded-lg font-raleway text-sm font-bold transition-colors shadow-sm"
                      >
                        Mark Food as Ready
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Invoice Modal */}
          {showInvoiceModal && frozenOrderData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-theme-bg-primary rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
                <OrderInvoice
                  ref={invoiceRef}
                  orderData={frozenOrderData}
                  businessInfo={{
                    name: shopData?.name || 'Zone Shop',
                    address: shopData?.address || 'Shop Address',
                    phone: shopData?.phone || 'Shop Phone',
                    email: shopData?.email || 'shop@tableserve.com',
                    type: 'zoneshop'
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

export default LiveOrders;